const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const MAX_BODY = 1024 * 1024;

const DEFAULT_JOBS = [
  {
    id: 'job-101',
    title: 'Senior EVM Smart Contract Engineer',
    company: 'ZeroChain DAO',
    companySlug: 'zerochain-dao',
    location: 'Remote / Global',
    remote: true,
    category: 'Web3',
    type: 'Full-time',
    experience: 'Senior',
    salaryMin: 150000,
    salaryMax: 210000,
    currency: 'USD',
    salaryText: '$150,000 - $210,000 USD',
    postedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    featured: true,
    easyApply: true,
    applicants: 8,
    tags: ['Solidity', 'Hardhat', 'DeFi', 'EVM'],
    applyMode: 'internal',
    applyUrl: '#apply/job-101',
    description: 'Design non-custodial liquidity vaults with strong gas optimization, Yul/Assembly, and automated fuzzing expertise.',
    requirements: ['5+ years smart-contract engineering', 'Solidity and EVM depth', 'Security-first development mindset'],
    benefits: ['Remote-first', 'Flexible hours', 'Token + cash compensation'],
    status: 'Active',
    views: 1248,
    companyRating: 4.6,
    equity: '0.10% - 0.30%',
    verified: false,
    createdBy: 'demo'
  },
  {
    id: 'job-102',
    title: 'AI Inference & CUDA Optimization Engineer',
    company: 'TensorPulse Labs',
    companySlug: 'tensorpulse-labs',
    location: 'Remote / San Francisco',
    remote: true,
    category: 'AI / Data',
    type: 'Full-time',
    experience: 'Senior',
    salaryMin: 180000,
    salaryMax: 240000,
    currency: 'USD',
    salaryText: '$180,000 - $240,000 USD',
    postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    featured: true,
    easyApply: true,
    applicants: 14,
    tags: ['Python', 'CUDA', 'PyTorch', 'LLM'],
    applyMode: 'internal',
    applyUrl: '#apply/job-102',
    description: 'Optimize high-throughput open-weight transformer serving infrastructure, cluster orchestration, and quantization.',
    requirements: ['Production CUDA experience', 'Strong Python/C++ skills', 'Distributed inference experience'],
    benefits: ['Health coverage', 'Remote stipend', 'Learning budget'],
    status: 'Active',
    views: 892,
    companyRating: 4.3,
    equity: null,
    verified: false,
    createdBy: 'demo'
  },
  {
    id: 'job-103',
    title: 'Rust Core Developer (Solana & Anchor)',
    company: 'SolX Protocol',
    companySlug: 'solx-protocol',
    location: 'Remote',
    remote: true,
    category: 'Web3',
    type: 'Contract',
    experience: 'Mid-level',
    salaryMin: 100,
    salaryMax: 140,
    currency: 'USD/hr',
    salaryText: '$100 - $140 / hr',
    postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    featured: false,
    easyApply: true,
    applicants: 5,
    tags: ['Rust', 'Solana', 'Anchor', 'DeFi'],
    applyMode: 'external',
    applyUrl: 'https://example.com/solx/jobs/rust-core',
    description: 'Build high-speed on-chain orderbook programs on Solana using Rust and Anchor with strong asynchronous systems knowledge.',
    requirements: ['3+ years Rust', 'Solana program experience', 'Async systems knowledge'],
    benefits: ['Flexible contract', 'Remote', 'Milestone bonuses'],
    status: 'Active',
    views: 641,
    companyRating: 4.1,
    equity: null,
    verified: false,
    createdBy: 'demo'
  },
  {
    id: 'job-104',
    title: 'Product Designer - Developer Tools',
    company: 'ForgeStack',
    companySlug: 'forgestack',
    location: 'New York, NY',
    remote: false,
    category: 'Design & Product',
    type: 'Full-time',
    experience: 'Mid-level',
    salaryMin: 125000,
    salaryMax: 165000,
    currency: 'USD',
    salaryText: '$125,000 - $165,000 USD',
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    featured: false,
    easyApply: false,
    applicants: 31,
    tags: ['Figma', 'Product Design', 'B2B', 'DevTools'],
    applyMode: 'external',
    applyUrl: 'https://example.com/forgestack/careers',
    description: 'Own the end-to-end UX for a developer platform used by teams shipping modern applications.',
    requirements: ['4+ years product design', 'Strong systems thinking', 'Portfolio required'],
    benefits: ['Hybrid schedule', 'Medical/dental', '401(k)'],
    status: 'Active',
    views: 534,
    companyRating: 4.7,
    equity: '0.02% - 0.08%',
    verified: false,
    createdBy: 'demo'
  },
  {
    id: 'job-105',
    title: 'Growth Marketing Lead',
    company: 'Orbit Commerce',
    companySlug: 'orbit-commerce',
    location: 'Remote / North America',
    remote: true,
    category: 'Marketing',
    type: 'Part-time',
    experience: 'Lead',
    salaryMin: 65,
    salaryMax: 90,
    currency: 'USD/hr',
    salaryText: '$65 - $90 / hr',
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    featured: false,
    easyApply: true,
    applicants: 12,
    tags: ['Growth', 'SEO', 'Analytics', 'Content'],
    applyMode: 'internal',
    applyUrl: '#apply/job-105',
    description: 'Lead growth experiments across acquisition, conversion, SEO, and lifecycle channels for a fast-moving commerce startup.',
    requirements: ['4+ years growth experience', 'Strong experimentation discipline', 'Excellent copy instincts'],
    benefits: ['20 hrs/week', 'Remote', 'Performance bonus'],
    status: 'Active',
    views: 388,
    companyRating: 4.4,
    equity: null,
    verified: false,
    createdBy: 'demo'
  }
];

const DEFAULT_COMPANIES = {
  'zerochain-dao': { name: 'ZeroChain DAO', slug: 'zerochain-dao', tagline: 'Building permissionless financial infrastructure.', size: '11-50', industry: 'Web3', location: 'Remote / Global', rating: 4.6, reviews: 18, openRoles: 4, about: 'Remote-native protocol team focused on smart contracts, liquidity, and developer infrastructure.', website: 'https://example.com/zerochain', founded: 2022, hiring: true },
  'tensorpulse-labs': { name: 'TensorPulse Labs', slug: 'tensorpulse-labs', tagline: 'Fast inference for real-world AI.', size: '51-200', industry: 'AI', location: 'San Francisco + Remote', rating: 4.3, reviews: 27, openRoles: 6, about: 'Applied AI infrastructure company optimizing model serving, evaluation, and deployment.', website: 'https://example.com/tensorpulse', founded: 2021, hiring: true },
  'solx-protocol': { name: 'SolX Protocol', slug: 'solx-protocol', tagline: 'Trading infrastructure for open networks.', size: '11-50', industry: 'Web3', location: 'Remote', rating: 4.1, reviews: 9, openRoles: 3, about: 'Protocol team building fast on-chain market infrastructure.', website: 'https://example.com/solx', founded: 2023, hiring: true },
  'forgestack': { name: 'ForgeStack', slug: 'forgestack', tagline: 'Developer tools that reduce time-to-ship.', size: '51-200', industry: 'Software', location: 'New York, NY', rating: 4.7, reviews: 31, openRoles: 5, about: 'Developer-product company making internal platforms easier to build, operate, and understand.', website: 'https://example.com/forgestack', founded: 2020, hiring: true },
  'orbit-commerce': { name: 'Orbit Commerce', slug: 'orbit-commerce', tagline: 'Commerce growth without the busywork.', size: '11-50', industry: 'Commerce', location: 'Remote / North America', rating: 4.4, reviews: 12, openRoles: 2, about: 'Commerce team focused on growth, retention, and practical automation.', website: 'https://example.com/orbit', founded: 2024, hiring: true }
};

const DEFAULT_REVIEWS = [
  { id: 'review-1', companySlug: 'zerochain-dao', rating: 5, title: 'Strong technical team', body: 'High ownership, clear technical goals, and plenty of autonomy.', createdAt: new Date(Date.now() - 9 * 86400000).toISOString() },
  { id: 'review-2', companySlug: 'tensorpulse-labs', rating: 4, title: 'Fast pace, good learning', body: 'Great exposure to production ML systems and strong engineering peers.', createdAt: new Date(Date.now() - 14 * 86400000).toISOString() }
];

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: DEFAULT_JOBS, companies: DEFAULT_COMPANIES, reviews: DEFAULT_REVIEWS, applications: [], reports: [] }, null, 2));
  }
}

function readDb() {
  ensureData();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    const fresh = { jobs: DEFAULT_JOBS, companies: DEFAULT_COMPANIES, reviews: DEFAULT_REVIEWS, applications: [], reports: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

function writeDb(db) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Cache-Control': 'no-store',
    ...headers,
    ...(typeof body === 'string' ? { 'Content-Type': 'text/plain; charset=utf-8' } : { 'Content-Type': 'application/json; charset=utf-8' })
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > MAX_BODY) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'company';
}

function normalizeJob(input) {
  const title = String(input.title || '').trim();
  const company = String(input.company || '').trim();
  if (!title || !company) throw new Error('Job title and company are required.');
  const salaryMin = Number.isFinite(Number(input.salaryMin)) ? Number(input.salaryMin) : null;
  const salaryMax = Number.isFinite(Number(input.salaryMax)) ? Number(input.salaryMax) : salaryMin;
  const companySlug = String(input.companySlug || slugify(company));
  const job = {
    id: `job-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    title,
    company,
    companySlug,
    location: String(input.location || 'Remote').trim(),
    remote: Boolean(input.remote),
    category: String(input.category || 'Other').trim(),
    type: String(input.type || 'Full-time').trim(),
    experience: String(input.experience || 'Mid-level').trim(),
    salaryMin,
    salaryMax,
    currency: String(input.currency || 'USD'),
    salaryText: String(input.salaryText || formatSalaryText(salaryMin, salaryMax, input.currency || 'USD')).trim(),
    postedAt: new Date().toISOString(),
    featured: Boolean(input.featured),
    easyApply: Boolean(input.easyApply),
    applicants: 0,
    tags: Array.isArray(input.tags) ? input.tags.map(v => String(v).trim()).filter(Boolean).slice(0, 20) : [],
    applyMode: input.applyMode === 'external' ? 'external' : 'internal',
    applyUrl: String(input.applyUrl || '').trim(),
    description: String(input.description || '').trim(),
    requirements: Array.isArray(input.requirements) ? input.requirements.map(v => String(v).trim()).filter(Boolean).slice(0, 20) : [],
    benefits: Array.isArray(input.benefits) ? input.benefits.map(v => String(v).trim()).filter(Boolean).slice(0, 20) : [],
    status: 'Active',
    views: 0,
    companyRating: 0,
    equity: input.equity ? String(input.equity) : null,
    verified: false,
    createdBy: 'anonymous'
  };
  if (job.applyMode === 'external' && !/^https?:\/\//i.test(job.applyUrl)) throw new Error('External application links must use http:// or https://.');
  return job;
}

function formatSalaryText(min, max, currency) {
  if (!Number.isFinite(min)) return 'Compensation not listed';
  const suffix = currency === 'USD/hr' ? ' / hr' : ` ${currency}`;
  const a = min.toLocaleString('en-US');
  const b = Number.isFinite(max) ? max.toLocaleString('en-US') : '';
  return Number.isFinite(max) && max !== min ? `$${a} - $${b}${suffix}` : `$${a}${suffix}`;
}

function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (pathname === '/') pathname = '/index.html';
  const requested = path.resolve(PUBLIC, '.' + pathname);
  const relative = path.relative(PUBLIC, requested);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return send(res, 403, 'Forbidden');
  fs.stat(requested, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not found');
    const ext = path.extname(requested).toLowerCase();
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
    res.writeHead(200, { 'Access-Control-Allow-Origin': CORS_ORIGIN, 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(requested).pipe(res);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);
  const db = readDb();

  if (req.method === 'GET' && parts.length === 2 && parts[1] === 'jobs') {
    return send(res, 200, { jobs: db.jobs });
  }
  if (req.method === 'GET' && parts.length === 3 && parts[1] === 'jobs') {
    const job = db.jobs.find(j => j.id === parts[2]);
    if (!job) return send(res, 404, { error: 'Job not found.' });
    job.views = Number(job.views || 0) + 1;
    writeDb(db);
    return send(res, 200, job);
  }
  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'jobs') {
    try {
      const job = normalizeJob(await readBody(req));
      db.jobs.unshift(job);
      const companySlug = job.companySlug;
      if (!db.companies[companySlug]) {
        db.companies[companySlug] = { name: job.company, slug: companySlug, tagline: 'New employer on NichePulse.', size: 'Not listed', industry: job.category, location: job.location, rating: 0, reviews: 0, openRoles: 1, about: 'Company profile created from an employer listing.', website: '', founded: null, hiring: true };
      } else {
        db.companies[companySlug].openRoles = db.jobs.filter(j => j.companySlug === companySlug && j.status === 'Active').length;
      }
      writeDb(db);
      return send(res, 201, { job, published: true, verificationRequired: false });
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
  }
  if (req.method === 'PATCH' && parts.length === 3 && parts[1] === 'jobs') {
    const job = db.jobs.find(j => j.id === parts[2]);
    if (!job) return send(res, 404, { error: 'Job not found.' });
    const body = await readBody(req);
    if (body.status) job.status = body.status === 'Filled' ? 'Filled' : 'Active';
    if (body.featured !== undefined) job.featured = Boolean(body.featured);
    writeDb(db);
    return send(res, 200, job);
  }
  if (req.method === 'DELETE' && parts.length === 3 && parts[1] === 'jobs') {
    const before = db.jobs.length;
    db.jobs = db.jobs.filter(j => j.id !== parts[2]);
    if (db.jobs.length === before) return send(res, 404, { error: 'Job not found.' });
    writeDb(db);
    return send(res, 200, { deleted: true });
  }
  if (req.method === 'GET' && parts.length === 3 && parts[1] === 'companies') {
    const company = db.companies[parts[2]];
    if (!company) return send(res, 404, { error: 'Company not found.' });
    const jobs = db.jobs.filter(j => j.companySlug === parts[2] && j.status === 'Active');
    const reviews = db.reviews.filter(r => r.companySlug === parts[2]).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    return send(res, 200, { company, jobs, reviews });
  }
  if (req.method === 'POST' && parts.length === 3 && parts[1] === 'companies' && parts[2] !== 'undefined') {
    const slug = parts[2];
    const body = await readBody(req);
    if (!db.companies[slug]) return send(res, 404, { error: 'Company not found.' });
    const rating = Math.max(1, Math.min(5, Number(body.rating || 0)));
    if (!Number.isFinite(rating) || !body.title || !body.body) return send(res, 400, { error: 'Rating, title and review are required.' });
    const review = { id: `review-${Date.now()}`, companySlug: slug, rating, title: String(body.title).trim().slice(0, 140), body: String(body.body).trim().slice(0, 1500), createdAt: new Date().toISOString() };
    db.reviews.push(review);
    const companyReviews = db.reviews.filter(r => r.companySlug === slug);
    db.companies[slug].reviews = companyReviews.length;
    db.companies[slug].rating = Number((companyReviews.reduce((sum, r) => sum + r.rating, 0) / companyReviews.length).toFixed(1));
    writeDb(db);
    return send(res, 201, review);
  }
  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'applications') {
    const body = await readBody(req);
    const job = db.jobs.find(j => j.id === body.jobId);
    if (!job) return send(res, 404, { error: 'Job not found.' });
    const application = { id: `app-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`, jobId: job.id, candidateName: String(body.candidateName || 'Anonymous Candidate').trim().slice(0, 100), email: String(body.email || '').trim().slice(0, 160), resumeUrl: String(body.resumeUrl || '').trim().slice(0, 500), note: String(body.note || '').trim().slice(0, 2000), status: 'Applied', createdAt: new Date().toISOString() };
    if (!application.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(application.email)) return send(res, 400, { error: 'A valid email is required for internal apply.' });
    db.applications.unshift(application);
    job.applicants = Number(job.applicants || 0) + 1;
    writeDb(db);
    return send(res, 201, application);
  }
  if (req.method === 'GET' && parts.length === 2 && parts[1] === 'applications') {
    return send(res, 200, { applications: db.applications });
  }
  if (req.method === 'PATCH' && parts.length === 3 && parts[1] === 'applications') {
    const application = db.applications.find(a => a.id === parts[2]);
    if (!application) return send(res, 404, { error: 'Application not found.' });
    const body = await readBody(req);
    const allowed = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Hired'];
    if (allowed.includes(body.status)) application.status = body.status;
    writeDb(db);
    return send(res, 200, application);
  }
  if (req.method === 'POST' && parts.length === 2 && parts[1] === 'reports') {
    const body = await readBody(req);
    db.reports.unshift({ id: `report-${Date.now()}`, ...body, createdAt: new Date().toISOString() });
    writeDb(db);
    return send(res, 201, { submitted: true });
  }
  if (req.method === 'GET' && parts.length === 2 && parts[1] === 'stats') {
    const active = db.jobs.filter(j => j.status === 'Active');
    const employers = new Set(active.map(j => j.companySlug)).size;
    return send(res, 200, { activeJobs: active.length, employers, applications: db.applications.length, views: active.reduce((s,j)=>s+Number(j.views||0),0) });
  }
  return send(res, 404, { error: 'API route not found.' });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  try {
    if (req.url.startsWith('/api/')) return await handleApi(req, res);
    return serveStatic(req, res);
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Server error.' });
  }
});

ensureData();
server.listen(PORT, () => {
  console.log(`NichePulse running at http://localhost:${PORT}`);
  console.log('Zero-verification publishing is enabled. Crypto payment is optional and never gates publishing.');
});
