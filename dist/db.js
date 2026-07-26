/**
 * ============================================================================
 * DB ACCESS LAYER (one JSON file per collection — no database of any kind)
 * ============================================================================
 * This is the ONLY file that touches storage directly. Each collection
 * lives in its own JSON file under DATA_DIR (default: data/db/):
 *
 *   customers.json      owners.json         bugs.json
 *   owner_labels.json    tickets.json        assignments.json
 *   slack_messages.json  notifications.json
 *
 * owners.json holds just owner identity ({id, name, max_load}); which
 * category(ies) an owner handles lives in owner_labels.json as
 * {id, owner_id, category} rows, joined at read time. Everything else is a
 * flat array of rows, same shape as the old SQL tables.
 * ============================================================================
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Overridable via env (e.g. to point at a mounted volume in production).
const DATA_DIR = process.env.DATA_DIR ?? path.resolve(__dirname, '../data/db');
// ---- Generic per-file collection ---------------------------------------
class Collection {
    rows = [];
    writeQueue = Promise.resolve();
    loaded = false;
    fileName;
    constructor(fileName) {
        this.fileName = fileName;
    }
    get filePath() {
        return path.join(DATA_DIR, this.fileName);
    }
    async load() {
        try {
            const raw = await readFile(this.filePath, 'utf8');
            this.rows = JSON.parse(raw);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                this.rows = [];
                await this.persist();
            }
            else {
                throw err;
            }
        }
        this.loaded = true;
    }
    requireLoaded() {
        if (!this.loaded) {
            this.rows = [];
            this.loaded = true;
        }
        return this.rows;
    }
    async persist() {
        this.writeQueue = this.writeQueue.then(async () => {
            const tmpFile = `${this.filePath}.tmp`;
            await writeFile(tmpFile, JSON.stringify(this.rows, null, 2), 'utf8');
            await rename(tmpFile, this.filePath);
        });
        await this.writeQueue;
    }
    all() {
        return this.requireLoaded();
    }
    find(predicate) {
        return this.requireLoaded().find(predicate);
    }
    filter(predicate) {
        return this.requireLoaded().filter(predicate);
    }
    nextId() {
        const rows = this.requireLoaded();
        return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    }
    async insert(row) {
        const rows = this.requireLoaded();
        const full = { ...row, id: this.nextId() };
        rows.push(full);
        await this.persist();
        return full;
    }
    async update(id, patch) {
        const rows = this.requireLoaded();
        const row = rows.find((r) => r.id === id);
        if (!row)
            return undefined;
        Object.assign(row, patch);
        await this.persist();
        return row;
    }
}
const customers = new Collection('customers.json');
const tickets = new Collection('tickets.json');
const slackMessages = new Collection('slack_messages.json');
const bugs = new Collection('bugs.json');
const owners = new Collection('owners.json');
const ownerLabels = new Collection('owner_labels.json');
const assignments = new Collection('assignments.json');
const notifications = new Collection('notifications.json');
const allCollections = [
    customers,
    tickets,
    slackMessages,
    bugs,
    owners,
    ownerLabels,
    assignments,
    notifications,
];
/** Loads every collection's JSON file from DATA_DIR. */
export async function initDb() {
    await mkdir(DATA_DIR, { recursive: true });
    await Promise.all(allCollections.map((c) => c.load()));
}
export async function closeDb() { }
function toCustomer(row) {
    return { id: row.id, name: row.name, email: row.email, domain: row.domain, tier: row.tier };
}
// ---- Customer lookup / correlation ----------------------------------------
export async function findOrCreateCustomer(name) {
    const existing = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing)
        return toCustomer(existing);
    const row = await customers.insert({
        name,
        email: null,
        domain: null,
        tier: 'standard',
        created_at: new Date().toISOString(),
    });
    return toCustomer(row);
}
export async function getCustomerByName(name) {
    const row = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
    return row ? toCustomer(row) : undefined;
}
export async function listCustomers() {
    return [...customers.all()].sort((a, b) => a.name.localeCompare(b.name)).map(toCustomer);
}
// ---- Signal Collector ------------------------------------------------------
export async function getSignalsForCustomer(customerId, customerName) {
    const signals = [];
    for (const t of tickets.filter((t) => t.customer_id === customerId)) {
        signals.push({
            source: 'ticket',
            timestamp: t.created_at,
            message: `${t.subject}: ${t.body}`,
            customer: customerName,
        });
    }
    for (const m of slackMessages.filter((m) => m.customer_id === customerId)) {
        signals.push({
            source: 'slack',
            timestamp: m.ts,
            message: m.text,
            customer: customerName,
        });
    }
    for (const b of bugs.filter((b) => b.customer_id === customerId)) {
        signals.push({
            source: 'bug',
            timestamp: b.created_at,
            message: `[${b.status}] ${b.title}: ${b.description}`,
            customer: customerName,
        });
    }
    return signals.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
function primaryCategoryFor(ownerId) {
    return ownerLabels.find((l) => l.owner_id === ownerId)?.category;
}
export async function getOwnersForCategory(category) {
    const ownerIds = ownerLabels.filter((l) => l.category === category).map((l) => l.owner_id);
    return owners
        .filter((o) => ownerIds.includes(o.id))
        .sort((a, b) => a.id - b.id)
        .map((o) => ({ id: o.id, name: o.name, category, max_load: o.max_load }));
}
export async function getCurrentLoad(ownerId) {
    return assignments.filter((a) => a.owner_id === ownerId && a.status === 'open').length;
}
export async function getAllOwnerLoads() {
    return Promise.all(owners.all().map(async (o) => ({
        owner: o.name,
        category: primaryCategoryFor(o.id) ?? '',
        load: await getCurrentLoad(o.id),
        max_load: o.max_load,
    })));
}
export async function createAssignment(customerId, ownerId, category, riskScore) {
    const row = await assignments.insert({
        customer_id: customerId,
        owner_id: ownerId,
        category,
        risk_score: riskScore,
        status: 'open',
        created_at: new Date().toISOString(),
    });
    return row.id;
}
// ---- Bugs -------------------------------------------------------------
export async function getBugsForCustomerName(customerName) {
    const customer = customers.find((c) => c.name.toLowerCase() === customerName.toLowerCase());
    if (!customer)
        return [];
    return bugs
        .filter((b) => b.customer_id === customer.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export async function markBugFixed(bugId) {
    await bugs.update(bugId, { status: 'fixed', fixed_at: new Date().toISOString() });
}
// ---- Notifications ------------------------------------------------------
export async function draftNotification(customerId, kind, message) {
    const row = await notifications.insert({
        customer_id: customerId,
        kind,
        message,
        approved: false,
        created_at: new Date().toISOString(),
        sent_at: null,
    });
    return row.id;
}
export async function approveAndSendNotification(notificationId) {
    return notifications.update(notificationId, { approved: true, sent_at: new Date().toISOString() });
}
export async function getPendingNotifications() {
    return notifications
        .filter((n) => !n.approved)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
