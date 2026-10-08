(() => {
  'use strict';

  const APP_KEY = 'nichepulse_v2';
  const state = {
    jobs: [],
    loaded: false,
    saved: new Set(),
    viewed: [],
    alerts: [],
    profile: {},
    applications: [],
    search: { q: '', location: '', remote: false, hybrid: false, onsite: false, under10: false, types: [], categories: [], experiences: [], minSalary: 0, maxSalary: 300000, date: 'any', easyApply: false, sort: 'relevance', savedOnly: false, viewedOnly: false },
    employer: { step: 1, draft: {} },
    mobileOpen: false
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const app = $('#app');

  const categoryOptions = ['Web3', 'AI / Data', 'Software Engineering', 'Design & Product', 'Marketing', 'Sales', 'Operations', 'Finance', 'Customer Support', 'Other'];
  const experienceOptions = ['Entry-level', 'Mid-level', 'Senior', 'Lead'];
  const typeOptions = ['Full-time', 'Part-time', 'Contract', 'Internship'];

  const demoSaved = JSON.parse(localStorage.getItem(APP_KEY) || '{}');
  state.saved = new Set(Array.isArray(demoSaved.saved) ? demoSaved.saved : []);
  state.viewed = Array.isArray(demoSaved.viewed) ? demoSaved.viewed : [];
  state.alerts = Array.isArray(demoSaved.alerts) ? demoSaved.alerts : [];
  state.profile = demoSaved.profile || {};

  function persistLocal() {
    localStorage.setItem(APP_KEY, JSON.stringify({ saved: [...state.saved], viewed: state.viewed.slice(0, 20), alerts: state.alerts, profile: state.profile }));
  }

  async function api(path, options = {}) {
    try {
      const res = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    } catch (err) {
      if (location.protocol === 'file:') return null;
      throw err;
    }
  }

  async function loadJobs() {
    if (state.loaded) return;
    const data = await api('/api/jobs').catch(() => null);
    if (data?.jobs) state.jobs = data.jobs;
    else state.jobs = getLocalFallbackJobs();
    state.loaded = true;
  }

  function getLocalFallbackJobs() {
    return [
      {id:'job-local-1',title:'Protocol Frontend Engineer',company:'OpenLayer',companySlug:'openlayer',location:'Remote / Global',remote:true,category:'Web3',type:'Full-time',experience:'Mid-level',salaryMin:120000,salaryMax:160000,currency:'USD',salaryText:'$120,000 - $160,000 USD',postedAt:new Date().toISOString(),featured:true,easyApply:true,applicants:6,tags:['React','TypeScript','Web3'],applyMode:'internal',applyUrl:'#apply/job-local-1',description:'Build polished interfaces for open financial protocols.',requirements:['React','TypeScript'],benefits:['Remote','Learning budget'],status:'Active',views:0,companyRating:4.5,equity:null,verified:false},
      {id:'job-local-2',title:'Senior ML Platform Engineer',company:'Northstar AI',companySlug:'northstar-ai',location:'Remote / US',remote:true,category:'AI / Data',type:'Full-time',experience:'Senior',salaryMin:175000,salaryMax:230000,currency:'USD',salaryText:'$175,000 - $230,000 USD',postedAt:new Date(Date.now()-2*86400000).toISOString(),featured:false,easyApply:true,applicants:17,tags:['Python','PyTorch','MLOps'],applyMode:'internal',applyUrl:'#apply/job-local-2',description:'Own model-serving infrastructure and ML developer tooling.',requirements:['Python','Cloud','MLOps'],benefits:['Health','Remote'],status:'Active',views:0,companyRating:4.3,equity:null,verified:false}
    ];
  }

  function fmtRelative(date) {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase();
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function safeExternalUrl(url) {
    const s = String(url || '').trim();
    if (!/^https?:\/\//i.test(s)) return '';
    try { return new URL(s).href; } catch { return ''; }
  }

  function money(v) {
    if (!Number.isFinite(Number(v))) return 'Not listed';
    return '$' + Number(v).toLocaleString('en-US');
  }

  function jobScore(job) {
    const q = state.search.q.toLowerCase().trim();
    if (!q) return 0;
    const hay = [job.title, job.company, job.category, job.location, ...(job.tags || [])].join(' ').toLowerCase();
    let score = 0;
    for (const term of q.split(/\s+/)) {
      if (job.title.toLowerCase().includes(term)) score += 5;
      if (job.company.toLowerCase().includes(term)) score += 3;
      if (hay.includes(term)) score += 1;
    }
    return score;
  }

  function matches(job) {
    const s = state.search;
    if (job.status !== 'Active') return false;
    const q = s.q.toLowerCase().trim();
    if (q) {
      const hay = [job.title, job.company, job.category, job.location, ...(job.tags || []), job.description].join(' ').toLowerCase();
      if (!q.split(/\s+/).every(term => hay.includes(term))) return false;
    }
    if (s.location && !job.location.toLowerCase().includes(s.location.toLowerCase())) return false;
    if (s.remote && !job.remote) return false;
    if (s.hybrid && !job.remote) return false;
    if (s.onsite && job.remote) return false;
    if (s.under10 && Number(job.applicants || 0) >= 10) return false;
    if (s.savedOnly && !state.saved.has(job.id)) return false;
    if (s.viewedOnly && !state.viewed.includes(job.id)) return false;
    if (s.types.length && !s.types.includes(job.type)) return false;
    if (s.categories.length && !s.categories.includes(job.category)) return false;
    if (s.experiences.length && !s.experiences.includes(job.experience)) return false;
    if (s.easyApply && !job.easyApply) return false;
    if (Number(s.minSalary) > 0 && Number(job.salaryMax || 0) < Number(s.minSalary)) return false;
    if (Number(s.maxSalary) < 300000 && Number(job.salaryMin || 0) > Number(s.maxSalary)) return false;
    if (s.date !== 'any') {
      const age = Date.now() - new Date(job.postedAt).getTime();
      const days = s.date === '24h' ? 1 : s.date === '7d' ? 7 : 30;
      if (age > days * 86400000) return false;
    }
    return true;
  }

  function filteredJobs() {
    const arr = state.jobs.filter(matches);
    switch (state.search.sort) {
      case 'recent': return arr.sort((a,b) => new Date(b.postedAt)-new Date(a.postedAt));
      case 'salary': return arr.sort((a,b) => Number(b.salaryMax||0)-Number(a.salaryMax||0));
      case 'applicants': return arr.sort((a,b) => Number(a.applicants||0)-Number(b.applicants||0));
      default: return arr.sort((a,b) => (Number(b.featured)-Number(a.featured)) || (jobScore(b)-jobScore(a)) || (new Date(b.postedAt)-new Date(a.postedAt)));
    }
  }

  function jobCard(job) {
    const saved = state.saved.has(job.id);
    return `<article class="job-card ${job.featured ? 'featured' : ''}">
      <div class="job-top">
        <div class="company-logo">${esc(initials(job.company))}</div>
        <div style="min-width:0;flex:1">
          <div class="pill-row">${job.featured ? '<span class="badge badge-brand">Featured</span>' : ''}${job.easyApply ? '<span class="badge badge-green">Easy apply</span>' : ''}${job.equity ? '<span class="badge badge-yellow">Equity</span>' : ''}</div>
          <h3 class="job-title"><a href="#job/${encodeURIComponent(job.id)}" class="link">${esc(job.title)}</a></h3>
          <div class="company-line"><a href="#company/${encodeURIComponent(job.companySlug)}">${esc(job.company)}</a> · ${esc(job.location)}</div>
          <div class="job-meta"><span>${esc(job.type)}</span><span>•</span><span>${esc(job.experience)}</span><span>•</span><span>${esc(job.category)}</span><span>•</span><span>${Number(job.applicants||0)} applicants</span></div>
          <div class="tag-list">${(job.tags||[]).slice(0,6).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
        </div>
        <div class="job-side"><div class="salary">${esc(job.salaryText || `${money(job.salaryMin)} - ${money(job.salaryMax)}`)}</div><span class="posted">${fmtRelative(job.postedAt)}</span></div>
      </div>
      <div class="job-actions">
        <button class="small-btn ${saved ? 'primary saved':''}" data-action="toggle-save" data-id="${esc(job.id)}">${saved ? '★ Saved' : '☆ Save'}</button>
        <a class="small-btn primary" href="#job/${encodeURIComponent(job.id)}">View job</a>
        ${job.easyApply ? `<button class="small-btn" data-action="apply" data-id="${esc(job.id)}">Easy apply</button>` : ''}
        <button class="small-btn" data-action="report" data-id="${esc(job.id)}">Report</button>
      </div>
    </article>`;
  }

  function pageJobs() {
    const jobs = filteredJobs();
    const s = state.search;
    return `<section>
      <div class="hero">
        <div class="hero-card">
          <span class="eyebrow">● Zero verification · crypto-friendly</span>
          <h1>Find work without the gatekeeping.</h1>
          <p>Search niche and mainstream-style roles, save listings, track applications, create alerts, explore salaries, and apply directly — with no identity or age verification for publishing.</p>
          <div class="hero-actions"><a class="btn btn-primary" href="#employer">Post a job instantly</a><a class="btn btn-ghost" href="#profile">Build your profile</a></div>
        </div>
        <div class="hero-side">
          <div class="stat-card"><strong>${state.jobs.filter(j=>j.status==='Active').length}</strong><span>active listings</span></div>
          <div class="mini-card"><h3>Crypto payment is optional</h3><p>Publish first. Payment instructions can be displayed for your chosen package, but no payment or verification step blocks a live listing.</p></div>
          <div class="mini-card"><h3>Built like a modern board</h3><p>Fast filters, salary visibility, saved jobs, alerts, profiles, company pages, reviews, Easy Apply, ATS-style employer tools.</p></div>
        </div>
      </div>

      <section class="section">
        <div class="search-shell">
          <div class="search-grid">
            <input id="search-q" class="field" value="${esc(s.q)}" placeholder="Job title, skills, company, keywords" aria-label="Search jobs">
            <input id="search-location" class="field" value="${esc(s.location)}" placeholder="Location or remote" aria-label="Location">
            <button class="btn btn-primary" data-action="run-search">Search jobs</button>
          </div>
          <div class="search-bottom">
            <button class="chip ${s.remote?'active':''}" data-action="toggle-filter" data-filter="remote">Remote</button>
            <button class="chip ${s.easyApply?'active':''}" data-action="toggle-filter" data-filter="easyApply">Easy Apply</button>
            <button class="chip ${s.date==='24h'?'active':''}" data-action="set-date" data-value="24h">Past 24h</button>
            <button class="chip ${s.date==='7d'?'active':''}" data-action="set-date" data-value="7d">Past week</button>
            <button class="chip ${s.date==='30d'?'active':''}" data-action="set-date" data-value="30d">Past month</button>
            <button class="chip" data-action="toggle-filters">More filters</button>
            <select id="sort-select" class="field" style="margin-left:auto;width:auto;min-width:165px"><option value="relevance" ${s.sort==='relevance'?'selected':''}>Most relevant</option><option value="recent" ${s.sort==='recent'?'selected':''}>Most recent</option><option value="salary" ${s.sort==='salary'?'selected':''}>Highest salary</option><option value="applicants" ${s.sort==='applicants'?'selected':''}>Fewer applicants</option></select>
          </div>
          <div id="advanced-filters" class="hidden" style="margin-top:13px"><div class="form-grid">
            <div><label class="label">Job type</label>${typeOptions.map(t=>`<label class="check"><input type="checkbox" data-filter-type="type" value="${esc(t)}" ${s.types.includes(t)?'checked':''}> ${esc(t)}</label>`).join('')}</div>
            <div><label class="label">Experience</label>${experienceOptions.map(t=>`<label class="check"><input type="checkbox" data-filter-type="experience" value="${esc(t)}" ${s.experiences.includes(t)?'checked':''}> ${esc(t)}</label>`).join('')}</div>
            <div><label class="label">Category</label>${categoryOptions.slice(0,8).map(t=>`<label class="check"><input type="checkbox" data-filter-type="category" value="${esc(t)}" ${s.categories.includes(t)?'checked':''}> ${esc(t)}</label>`).join('')}</div>
            <div><label class="label">Salary range</label><div class="range-row"><input id="min-salary" class="field" type="number" min="0" value="${Number(s.minSalary)||0}" placeholder="Min"><input id="max-salary" class="field" type="number" min="0" value="${Number(s.maxSalary)||300000}" placeholder="Max"></div><div class="hint">Use yearly salary or the listing's comparable numeric range.</div></div>
          </div><div style="margin-top:10px"><button class="btn" data-action="clear-filters">Reset filters</button><button class="btn btn-primary" data-action="apply-advanced">Apply filters</button></div></div>
        </div>
      </section>

      <section class="section"><div class="section-title"><div><h2>${jobs.length} jobs found</h2><p>Search results update locally and persist saved jobs in this browser.</p></div><button class="btn" data-action="create-alert">Create alert</button></div>
        <div class="results-layout">
          <aside class="filters-panel"><h3>Popular filters</h3><div class="filter-group"><div class="filter-label">Workplace</div><label class="check"><input type="checkbox" data-filter-quick="remote" ${s.remote?'checked':''}> Remote</label><label class="check"><input type="checkbox" data-filter-quick="hybrid" ${s.hybrid?'checked':''}> Hybrid</label><label class="check"><input type="checkbox" data-filter-quick="onsite" ${s.onsite?'checked':''}> On-site</label></div><div class="filter-group"><div class="filter-label">Candidate-friendly</div><label class="check"><input type="checkbox" data-filter-quick="easyApply" ${s.easyApply?'checked':''}> Easy Apply</label><label class="check"><input type="checkbox" data-filter-quick="under10" ${s.under10?'checked':''}> Under 10 applicants</label></div><div class="filter-group"><div class="filter-label">Shortcuts</div><button class="btn" style="width:100%;margin-bottom:8px" data-action="show-saved">Saved jobs (${state.saved.size})</button><button class="btn" style="width:100%" data-action="show-viewed">Recently viewed</button></div></aside>
          <div><div class="jobs-list">${jobs.length ? jobs.map(jobCard).join('') : '<div class="empty"><h3>No jobs match these filters.</h3><p>Try a broader keyword or reset the search.</p><button class="btn btn-primary" data-action="clear-filters">Reset search</button></div>'}</div></div>
        </div><div class="panel" style="margin-top:16px"><h2>Recommended for you</h2><p class="muted">Smart matches are based on your saved jobs and profile skills.</p><div class="jobs-list">${getRecommendedJobs(3).map(jobCard).join('') || '<p class="muted">Save a few jobs or add skills to your profile to improve matches.</p>'}</div></div>
      </section>
    </section>`;
  }

  function getRecommendedJobs(limit=3) {
    const skills = String(state.profile.skills || '').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
    const savedJobs = state.jobs.filter(j=>state.saved.has(j.id));
    const savedTags = new Set(savedJobs.flatMap(j=>j.tags || []).map(x=>String(x).toLowerCase()));
    return state.jobs.filter(j=>j.status==='Active' && !state.search.savedOnly && !state.search.viewedOnly).map(j=>({j,score:(j.featured?2:0)+skills.reduce((n,s)=>n+(j.tags||[]).some(t=>String(t).toLowerCase().includes(s))?3:0,0)+(j.tags||[]).reduce((n,t)=>n+(savedTags.has(String(t).toLowerCase())?2:0),0)})).sort((a,b)=>b.score-a.score || new Date(b.j.postedAt)-new Date(a.j.postedAt)).slice(0,limit).map(x=>x.j);
  }

  async function pageJobDetail(id) {
    let job = state.jobs.find(j => j.id === id);
    const apiJob = await api('/api/jobs/' + encodeURIComponent(id)).catch(() => null);
    if (apiJob) job = apiJob;
    if (!job) return `<div class="empty"><h2>Job not found</h2><a class="btn btn-primary" href="#jobs">Back to jobs</a></div>`;
    state.viewed = [job.id, ...state.viewed.filter(x=>x!==job.id)].slice(0,20); persistLocal();
    const external = safeExternalUrl(job.applyUrl);
    return `<section class="section"><a class="link" href="#jobs">← Back to all jobs</a><div class="panel" style="margin-top:12px"><div class="detail-head"><div class="company-logo">${esc(initials(job.company))}</div><div style="flex:1"><div class="pill-row">${job.featured?'<span class="badge badge-brand">Featured</span>':''}${job.easyApply?'<span class="badge badge-green">Easy Apply</span>':''}</div><h1 class="detail-title">${esc(job.title)}</h1><div class="detail-sub"><a class="link" href="#company/${encodeURIComponent(job.companySlug)}">${esc(job.company)}</a> · ${esc(job.location)} · ${esc(job.type)} · ${esc(job.experience)}</div></div><div class="detail-actions"><button class="btn" data-action="toggle-save" data-id="${esc(job.id)}">${state.saved.has(job.id)?'★ Saved':'☆ Save'}</button>${job.easyApply?'<button class="btn btn-primary" data-action="apply" data-id="'+esc(job.id)+'">Easy apply</button>':''}</div></div><div class="hr"></div><div class="detail-grid"><div class="prose"><div class="keyfacts"><div class="fact"><small>Compensation</small><strong class="text-green">${esc(job.salaryText || 'Not listed')}</strong></div><div class="fact"><small>Applicants</small><strong>${Number(job.applicants||0)}</strong></div><div class="fact"><small>Posted</small><strong>${fmtRelative(job.postedAt)}</strong></div><div class="fact"><small>Views</small><strong>${Number(job.views||0)}</strong></div></div><h3>About the role</h3><p>${esc(job.description)}</p>${job.requirements?.length?'<h3>Requirements</h3><ul>'+job.requirements.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':''}${job.benefits?.length?'<h3>Benefits</h3><ul>'+job.benefits.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':''}<h3>Skills</h3><div class="tag-list">${(job.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div><aside class="panel" style="padding:15px"><h3>Apply</h3>${external?`<p class="muted">This employer uses an external application.</p><a class="btn btn-primary" style="width:100%;text-align:center" href="${esc(external)}" target="_blank" rel="noopener noreferrer">Apply on employer site ↗</a>`:`<button class="btn btn-primary" style="width:100%" data-action="apply" data-id="${esc(job.id)}">Apply in one step</button>`}<div class="callout green" style="margin-top:12px">No identity verification is required to browse or apply. Internal applications ask for a contact email so the employer can respond.</div><div style="margin-top:12px"><button class="small-btn" data-action="report" data-id="${esc(job.id)}">Report listing</button></div></aside></div></div></section>`;
  }

  function pageCompanies() {
    const companies = Object.values(getCompaniesFromJobs());
    return `<section class="section"><div class="section-title"><div><h1>Company directory</h1><p>Compare hiring activity, pay transparency and community reviews.</p></div><a class="btn btn-primary" href="#employer">Hire on NichePulse</a></div><div class="form-grid">${companies.map(c=>`<div class="panel"><div class="detail-head"><div class="company-logo">${esc(initials(c.name))}</div><div style="flex:1"><h2 style="margin:0"><a class="link" href="#company/${encodeURIComponent(c.slug)}">${esc(c.name)}</a></h2><p class="muted">${esc(c.tagline||'Hiring now')}</p></div></div><div class="job-meta"><span>${esc(c.industry||'Other')}</span><span>•</span><span>${esc(c.size||'Size not listed')}</span><span>•</span><span>${Number(c.openRoles||0)} open roles</span></div><div style="margin-top:12px"><span class="stars">${'★'.repeat(Math.round(Number(c.rating||0)))}${'☆'.repeat(Math.max(0,5-Math.round(Number(c.rating||0))))}</span> <span class="muted">${c.rating?Number(c.rating).toFixed(1):'New'} (${Number(c.reviews||0)} reviews)</span></div></div>`).join('')}</div></section>`;
  }

  function getCompaniesFromJobs() {
    const map = {};
    for (const job of state.jobs) {
      if (!map[job.companySlug]) map[job.companySlug] = {slug:job.companySlug,name:job.company,rating:job.companyRating||0,reviews:0,industry:job.category,size:'',tagline:'',openRoles:0};
      if (job.status==='Active') map[job.companySlug].openRoles++;
    }
    return map;
  }

  async function pageCompany(slug) {
    const data = await api('/api/companies/' + encodeURIComponent(slug)).catch(() => null);
    const localJobs = state.jobs.filter(j=>j.companySlug===slug && j.status==='Active');
    const company = data?.company || getCompaniesFromJobs()[slug] || {name:'Company',slug};
    const jobs = data?.jobs || localJobs;
    const reviews = data?.reviews || [];
    return `<section class="section"><a class="link" href="#companies">← Company directory</a><div class="panel" style="margin-top:12px"><div class="company-banner"><div><div class="detail-head"><div class="company-logo">${esc(initials(company.name))}</div><div><h1 class="detail-title">${esc(company.name)}</h1><div class="detail-sub">${esc(company.tagline||'Hiring on NichePulse')} · ${esc(company.location||'Location not listed')}</div></div></div></div><div><div class="company-score">${company.rating?Number(company.rating).toFixed(1):'—'}</div><div class="stars">${company.rating?'★★★★★':'☆☆☆☆☆'}</div><div class="muted">${Number(company.reviews||0)} reviews</div></div></div><div class="hr"></div><div class="detail-grid"><div class="prose"><h3>About</h3><p>${esc(company.about||'No company summary yet.')}</p><h3>Open roles</h3><div class="jobs-list">${jobs.length?jobs.map(jobCard).join(''):'<div class="empty">No active roles right now.</div>'}</div></div><aside class="panel"><h3>Company facts</h3><div class="keyfacts"><div class="fact"><small>Industry</small><strong>${esc(company.industry||'—')}</strong></div><div class="fact"><small>Company size</small><strong>${esc(company.size||'—')}</strong></div><div class="fact"><small>Founded</small><strong>${esc(company.founded||'—')}</strong></div><div class="fact"><small>Hiring</small><strong class="text-green">${company.hiring===false?'Not currently hiring':'Active'}</strong></div></div>${company.website?`<a class="btn" style="margin-top:12px" href="${esc(safeExternalUrl(company.website))}" target="_blank" rel="noopener">Company website ↗</a>`:''}<div class="hr"></div><button class="btn btn-primary" data-action="open-review" data-company="${esc(company.slug)}">Write a review</button></aside></div></div><div class="panel" style="margin-top:18px"><h2>Community reviews</h2>${reviews.length?reviews.map(r=>`<div class="review"><div class="stars">${'★'.repeat(Number(r.rating))}${'☆'.repeat(5-Number(r.rating))}</div><strong>${esc(r.title)}</strong><p class="muted">${esc(r.body)}</p><small class="muted">${fmtRelative(r.createdAt)}</small></div>`).join(''):'<p class="muted">No reviews yet. Be the first.</p>'}</div></section>`;
  }

  async function pageApplications() {
    const apiData = await api('/api/applications').catch(() => null);
    const apps = apiData?.applications || state.applications.length ? (apiData?.applications || state.applications) : JSON.parse(localStorage.getItem('nichepulse_applications')||'[]');
    state.applications = apps;
    const grouped = ['Applied','Screening','Interview','Offer','Hired','Rejected'];
    return `<section class="section"><div class="section-title"><div><h1>My applications</h1><p>Track where every application stands without needing an account.</p></div><a class="btn" href="#jobs">Find another job</a></div><div class="form-grid">${grouped.map(status=>`<div class="panel"><h3>${status}</h3>${apps.filter(a=>a.status===status).map(a=>{const job=state.jobs.find(j=>j.id===a.jobId);return `<div class="fact" style="margin-top:9px"><strong>${esc(job?.title||'Job')}</strong><small>${esc(job?.company||'Employer')}</small><div class="job-actions"><a class="small-btn" href="#job/${encodeURIComponent(a.jobId)}">View</a><button class="small-btn" data-action="advance-application" data-id="${esc(a.id)}">Advance</button></div></div>`}).join('') || '<p class="muted">Nothing here yet.</p>'}</div>`).join('')}</div></section>`;
  }

  function pageProfile() {
    const p = state.profile;
    return `<section class="section"><div class="section-title"><div><h1>Your zero-verification profile</h1><p>Keep a reusable profile for fast applications and recruiter discovery.</p></div><span class="badge badge-green">No identity check</span></div><div class="profile-grid"><div class="panel"><h2>Candidate profile</h2><div class="form-grid"><div><label class="label">Display name</label><input id="profile-name" class="field" value="${esc(p.name||'')}" placeholder="Your name or alias"></div><div><label class="label">Email</label><input id="profile-email" class="field" value="${esc(p.email||'')}" placeholder="you@example.com"></div><div><label class="label">Headline</label><input id="profile-headline" class="field" value="${esc(p.headline||'')}" placeholder="Senior Solidity Engineer"></div><div><label class="label">Location</label><input id="profile-location" class="field" value="${esc(p.location||'')}" placeholder="Remote / Global"></div><div class="full"><label class="label">Skills</label><input id="profile-skills" class="field" value="${esc(p.skills||'')}" placeholder="Solidity, Rust, React"></div><div class="full"><label class="label">About</label><textarea id="profile-about" class="field" rows="6" placeholder="Tell employers what you build.">${esc(p.about||'')}</textarea></div></div><button class="btn btn-primary" data-action="save-profile">Save profile locally</button></div><div class="panel"><h2>Discovery settings</h2><label class="check"><input id="profile-open" type="checkbox" ${p.openToWork!==false?'checked':''}> Open to recruiter messages</label><label class="check"><input id="profile-public" type="checkbox" ${p.public!==false?'checked':''}> Make profile discoverable</label><div class="hr"></div><div class="callout">No KYC is used for profiles. You control whether you are discoverable, and this demo stores your profile in this browser.</div><div class="hr"></div><h3>Resume / portfolio</h3><input id="profile-url" class="field" value="${esc(p.portfolio||'')}" placeholder="https://..." /><p class="hint">Paste a public resume, portfolio, GitHub, or LinkedIn link.</p></div></div></section>`;
  }

  function pageAlerts() {
    return `<section class="section"><div class="section-title"><div><h1>Job alerts</h1><p>Save searches so you can come back to matching roles.</p></div><button class="btn btn-primary" data-action="create-alert">Create alert</button></div><div class="form-grid">${state.alerts.length?state.alerts.map(a=>`<div class="panel"><strong>${esc(a.q||'All jobs')}</strong><p class="muted">${esc(a.location||'Any location')} · ${a.remote?'Remote · ':''}${esc(a.frequency||'Daily')}</p><div class="job-actions"><button class="small-btn" data-action="delete-alert" data-id="${esc(a.id)}">Delete</button><a class="small-btn primary" href="#jobs">Run search</a></div></div>`).join(''):'<div class="empty" style="grid-column:1/-1">No alerts yet. Create one from the job search page.</div>'}</div></section>`;
  }

  function pageSalaryExplorer() {
    const jobs = state.jobs.filter(j=>j.status==='Active' && Number(j.salaryMin)>0);
    const groups = {};
    jobs.forEach(j=>{groups[j.category]??=[];groups[j.category].push(j)});
    return `<section class="section"><div class="section-title"><div><h1>Salary explorer</h1><p>Use the live listings in this board as the local compensation dataset.</p></div><a class="btn" href="#jobs">Use salary filter</a></div><div class="form-grid">${Object.entries(groups).map(([cat, arr])=>{const mins=arr.map(j=>j.salaryMin), maxs=arr.map(j=>j.salaryMax);const avgMin=Math.round(mins.reduce((a,b)=>a+b,0)/mins.length);const avgMax=Math.round(maxs.reduce((a,b)=>a+b,0)/maxs.length);return `<div class="panel"><div class="muted">${esc(cat)}</div><h2>${money(avgMin)} - ${money(avgMax)}</h2><div class="progress"><span style="width:${Math.min(100,Math.round(avgMax/250000*100))}%"></span></div><p class="muted">${arr.length} active listing${arr.length===1?'':'s'} with numeric compensation.</p></div>`}).join('')}</div><div class="panel" style="margin-top:18px"><h2>Compensation transparency</h2><p class="muted">Popular boards increasingly surface salary, location, experience, job type, and application friction as core search signals. NichePulse makes those fields first-class for every employer post.</p></div></section>`;
  }

  function pageHow() {
    return `<section class="section"><div class="split"><div class="panel"><span class="eyebrow">How NichePulse works</span><h1>Publish now. Verify nothing.</h1><p class="prose">Employers create a listing, choose optional package / crypto-payment details, and publish immediately. There is no ID check, age check, wallet-signature requirement, or payment verification gate in the publish flow.</p><div class="form-grid"><div class="fact"><small>1</small><strong>Create listing</strong><p class="muted">Add role, pay, location, type, experience, skills and apply route.</p></div><div class="fact"><small>2</small><strong>Publish instantly</strong><p class="muted">The job is written to the board immediately when you submit.</p></div><div class="fact"><small>3</small><strong>Optional crypto payment</strong><p class="muted">Show supported assets and receiving addresses independently from publishing.</p></div><div class="fact"><small>4</small><strong>Manage applicants</strong><p class="muted">Move candidates through an ATS-style pipeline.</p></div></div></div><div class="panel"><h2>Built for candidates too</h2><p class="muted">Save jobs, create alerts, build a profile, apply with reusable information, compare companies and reviews, and track your applications.</p><a class="btn btn-primary" href="#jobs">Browse jobs</a></div></div></section>`;
  }

  function pagePolicy() {
    return `<section class="section"><div class="panel"><h1>Zero-verification policy</h1><p class="prose">NichePulse does not require identity, age, phone, wallet or transaction verification in the publishing flow. That is a product design choice, not a claim that every listing is trustworthy. Community reporting, abuse controls, and ordinary application contact fields may still be used.</p><div class="form-grid"><div class="fact"><small>Required to publish</small><strong>Role details + application route</strong></div><div class="fact"><small>Not required</small><strong>ID, age checks, KYC, payment verification</strong></div><div class="fact"><small>Crypto</small><strong>Optional payment / address display</strong></div><div class="fact"><small>Applications</small><strong>Direct or internal, employer controlled</strong></div></div></div></section>`;
  }

  function pageFaq() {
    return `<section class="section"><div class="panel"><h1>FAQ</h1><div class="review"><strong>Can I post without paying?</strong><p class="muted">Yes. The core build publishes immediately without a payment gate.</p></div><div class="review"><strong>Can I still show crypto payment options?</strong><p class="muted">Yes. Employers can display optional payment package details and supported assets.</p></div><div class="review"><strong>Do candidates need accounts?</strong><p class="muted">No. Saved jobs, alerts, and profiles work with browser-local state in this build.</p></div><div class="review"><strong>Can employers manage applicants?</strong><p class="muted">Yes. When served by the included Node server, internal applications are stored server-side and can be moved through the dashboard pipeline.</p></div></div></section>`;
  }

  function pageEmployer() {
    const d = state.employer.draft;
    const step = state.employer.step;
    const stepContent = step===1 ? `<div class="panel"><h2>Step 1 — Role basics</h2><div class="form-grid"><div><label class="label">Job title *</label><input id="e-title" class="field" value="${esc(d.title||'')}" placeholder="Senior Smart Contract Engineer"></div><div><label class="label">Company *</label><input id="e-company" class="field" value="${esc(d.company||'')}" placeholder="Your company or project"></div><div><label class="label">Category</label><select id="e-category" class="field">${categoryOptions.map(x=>`<option ${d.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div><div><label class="label">Job type</label><select id="e-type" class="field">${typeOptions.map(x=>`<option ${d.type===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div><div><label class="label">Experience</label><select id="e-experience" class="field">${experienceOptions.map(x=>`<option ${d.experience===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div><div><label class="label">Location</label><input id="e-location" class="field" value="${esc(d.location||'Remote / Global')}" placeholder="Remote / Global"></div><div class="full"><label class="check"><input id="e-remote" type="checkbox" ${d.remote!==false?'checked':''}> Remote-friendly</label></div></div><button class="btn btn-primary" data-action="employer-next">Next: compensation</button></div>` : step===2 ? `<div class="panel"><h2>Step 2 — Compensation & discoverability</h2><div class="form-grid"><div><label class="label">Minimum salary</label><input id="e-min" class="field" type="number" min="0" value="${esc(d.salaryMin||'')}" placeholder="120000"></div><div><label class="label">Maximum salary</label><input id="e-max" class="field" type="number" min="0" value="${esc(d.salaryMax||'')}" placeholder="160000"></div><div><label class="label">Salary text</label><input id="e-salaryText" class="field" value="${esc(d.salaryText||'')}" placeholder="$120,000 - $160,000 USD"></div><div><label class="label">Tags</label><input id="e-tags" class="field" value="${esc((d.tags||[]).join(', '))}" placeholder="Solidity, Rust, DeFi"></div><div><label class="check"><input id="e-featured" type="checkbox" ${d.featured?'checked':''}> Featured placement</label></div><div><label class="check"><input id="e-easy" type="checkbox" ${d.easyApply!==false?'checked':''}> Enable Easy Apply</label></div><div class="full"><label class="label">Description *</label><textarea id="e-desc" class="field" rows="7" placeholder="Describe the role, responsibilities, and what success looks like.">${esc(d.description||'')}</textarea></div></div><div class="crypto-box" style="margin-top:13px"><div class="crypto-card"><strong>Crypto package — optional</strong><p class="muted">Select or show a payment package, but it never blocks publication.</p><select id="e-package" class="field"><option value="free" ${d.package==='free'?'selected':''}>Free / no payment</option><option value="standard" ${d.package==='standard'?'selected':''}>Standard — 99 USDT</option><option value="featured" ${d.package==='featured'?'selected':''}>Featured — 199 USDT</option><option value="broadcast" ${d.package==='broadcast'?'selected':''}>Broadcast — 299 USDT</option></select></div><div class="crypto-card"><strong>Supported assets</strong><p class="muted">USDT ERC-20 · USDT TRC-20 · ETH · SOL · BTC · XMR</p><div class="notice">No wallet signature. No TXID. No payment verification. Publish remains available.</div></div></div><div style="margin-top:13px"><button class="btn" data-action="employer-back">Back</button> <button class="btn btn-primary" data-action="employer-next">Next: apply settings</button></div></div>` : `<div class="panel"><h2>Step 3 — Application & publish</h2><div class="form-grid"><div><label class="label">Apply mode</label><select id="e-applyMode" class="field"><option value="internal" ${d.applyMode!=='external'?'selected':''}>Internal Easy Apply</option><option value="external" ${d.applyMode==='external'?'selected':''}>External link</option></select></div><div><label class="label">Application URL (external only)</label><input id="e-applyUrl" class="field" value="${esc(d.applyUrl||'')}" placeholder="https://company.com/careers"></div><div class="full"><label class="label">Key requirements (one per line)</label><textarea id="e-requirements" class="field" rows="4">${esc((d.requirements||[]).join('\n'))}</textarea></div><div class="full"><label class="label">Benefits (one per line)</label><textarea id="e-benefits" class="field" rows="4">${esc((d.benefits||[]).join('\n'))}</textarea></div></div><div class="callout green" style="margin-top:13px"><strong>Ready to publish immediately.</strong> Submitting this form creates the listing and makes it live. No payment or verification callback is required.</div><div style="margin-top:13px"><button class="btn" data-action="employer-back">Back</button> <button class="btn btn-primary" data-action="publish-job">Publish job now</button></div></div>`;
    return `<section class="section"><div class="section-title"><div><h1>Post a job</h1><p>Create a polished listing with no account or verification wall.</p></div><span class="badge badge-green">LIVE PUBLISHING</span></div><div class="wizard"><aside class="steps"><div class="step ${step===1?'active':''}">1 · Role basics</div><div class="step ${step===2?'active':''}">2 · Compensation</div><div class="step ${step===3?'active':''}">3 · Apply & publish</div></aside>${stepContent}</div></section>`;
  }

  async function pageEmployerDashboard() {
    const data = await api('/api/applications').catch(() => null);
    const applications = data?.applications || [];
    const active = state.jobs.filter(j=>j.status==='Active');
    return `<section class="section"><div class="section-title"><div><h1>Employer dashboard</h1><p>ATS-style controls, listing performance and applicant pipeline.</p></div><a class="btn btn-primary" href="#employer">New listing</a></div><div class="kpi-grid"><div class="kpi"><strong>${active.length}</strong><small>Active jobs</small></div><div class="kpi"><strong>${active.reduce((s,j)=>s+Number(j.views||0),0)}</strong><small>Listing views</small></div><div class="kpi"><strong>${active.reduce((s,j)=>s+Number(j.applicants||0),0)}</strong><small>Applicants</small></div><div class="kpi"><strong>${applications.filter(a=>a.status==='Interview').length}</strong><small>Interviews</small></div></div><div class="form-grid" style="margin-top:18px"><div class="panel"><h2>Job management</h2><div class="table-wrap"><table class="table"><thead><tr><th>Role</th><th>Views</th><th>Applicants</th><th>Status</th><th></th></tr></thead><tbody>${state.jobs.map(j=>`<tr><td><strong>${esc(j.title)}</strong><br><span class="muted">${esc(j.company)}</span></td><td>${Number(j.views||0)}</td><td>${Number(j.applicants||0)}</td><td>${esc(j.status)}</td><td><div class="pill-row"><a class="small-btn" href="#job/${encodeURIComponent(j.id)}">View</a><button class="small-btn" data-action="toggle-job-status" data-id="${esc(j.id)}">${j.status==='Active'?'Mark filled':'Reactivate'}</button><button class="small-btn" data-action="delete-job" data-id="${esc(j.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div><div class="panel"><h2>Applicant pipeline</h2>${applications.length?['Applied','Screening','Interview','Offer','Hired','Rejected'].map(status=>{const count=applications.filter(a=>a.status===status).length;return `<div style="margin:13px 0"><div class="notice-wide"><span>${status}</span><strong>${count}</strong></div><div class="progress" style="margin-top:6px"><span style="width:${applications.length?Math.round(count/applications.length*100):0}%"></span></div></div>`}).join(''):'<p class="muted">No internal applicants yet.</p>'}</div></div><div class="panel" style="margin-top:18px"><h2>Candidate search</h2><p class="muted">A zero-verification board can still give employers structured candidate discovery. This build keeps discovery local: search tags and candidate profiles stored in your browser/session.</p><button class="btn" data-action="demo-candidates">Open candidate pool</button></div></section>`;
  }

  function pageCandidates() {
    const candidates = [
      {name:'Ari M.',headline:'Senior Solidity Engineer',skills:'Solidity · Foundry · EVM · Security',location:'Remote',rate:'$160k+',open:true},
      {name:'Kai R.',headline:'AI Infrastructure Engineer',skills:'Python · CUDA · PyTorch · Kubernetes',location:'US / Remote',rate:'$180k+',open:true},
      {name:'Sam T.',headline:'Product Designer',skills:'Figma · UX systems · B2B · Research',location:'New York / Hybrid',rate:'$135k+',open:false}
    ];
    return `<section class="section"><div class="section-title"><div><h1>Candidate pool</h1><p>Sample recruiter discovery view with explicit preference controls.</p></div><span class="badge badge-brand">DEMO DATA</span></div><div class="form-grid">${candidates.map(c=>`<div class="panel"><div class="detail-head"><div class="company-logo">${esc(initials(c.name))}</div><div style="flex:1"><h3 style="margin:0">${esc(c.name)}</h3><div class="muted">${esc(c.headline)}</div></div><span class="badge ${c.open?'badge-green':''}">${c.open?'Open to work':'Private'}</span></div><div class="job-meta"><span>${esc(c.location)}</span><span>•</span><span>${esc(c.rate)}</span></div><p class="muted">${esc(c.skills)}</p><button class="btn" data-action="message-candidate" data-name="${esc(c.name)}">Message</button></div>`).join('')}</div></section>`;
  }

  async function render() {
    await loadJobs();
    const hash = location.hash || '#jobs';
    const route = decodeURIComponent(hash.slice(1));
    const [name, id] = route.split('/');
    $$('.desktop-nav a').forEach(a => a.classList.toggle('active', a.dataset.nav===name));
    $('#mobile-nav').classList.add('hidden'); state.mobileOpen=false;
    let html='';
    if (name==='jobs') html=pageJobs();
    else if (name==='job') html=await pageJobDetail(id);
    else if (name==='companies') html=pageCompanies();
    else if (name==='company') html=await pageCompany(id);
    else if (name==='applications') html=await pageApplications();
    else if (name==='profile') html=pageProfile();
    else if (name==='alerts') html=pageAlerts();
    else if (name==='salaries') html=pageSalaryExplorer();
    else if (name==='employer') html=pageEmployer();
    else if (name==='employer-dashboard') html=await pageEmployerDashboard();
    else if (name==='candidates') html=pageCandidates();
    else if (name==='how-it-works') html=pageHow();
    else if (name==='policy') html=pagePolicy();
    else if (name==='faq') html=pageFaq();
    else html=pageJobs();
    app.innerHTML = html;
    window.scrollTo(0,0);
  }

  function showToast(msg) {
    const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),2600);
  }

  function readEmployerStep() {
    const d=state.employer.draft;
    const get=id=>document.getElementById(id)?.value ?? '';
    if (state.employer.step===1) Object.assign(d,{title:get('e-title'),company:get('e-company'),category:get('e-category'),type:get('e-type'),experience:get('e-experience'),location:get('e-location'),remote:document.getElementById('e-remote')?.checked});
    if (state.employer.step===2) Object.assign(d,{salaryMin:Number(get('e-min'))||0,salaryMax:Number(get('e-max'))||0,salaryText:get('e-salaryText'),tags:get('e-tags').split(',').map(x=>x.trim()).filter(Boolean),featured:document.getElementById('e-featured')?.checked,easyApply:document.getElementById('e-easy')?.checked,description:get('e-desc'),package:get('e-package')});
    if (state.employer.step===3) Object.assign(d,{applyMode:get('e-applyMode'),applyUrl:get('e-applyUrl'),requirements:get('e-requirements').split('\n').map(x=>x.trim()).filter(Boolean),benefits:get('e-benefits').split('\n').map(x=>x.trim()).filter(Boolean)});
  }

  async function publishEmployerJob() {
    readEmployerStep();
    const d=state.employer.draft;
    if (!d.title || !d.company || !d.description) return showToast('Add the title, company and description first.');
    if (d.applyMode==='external' && !safeExternalUrl(d.applyUrl)) return showToast('Use a valid http(s) application URL.');
    const payload={...d,salaryText:d.salaryText || (d.salaryMin?`$${Number(d.salaryMin).toLocaleString()} - $${Number(d.salaryMax||d.salaryMin).toLocaleString()} USD`:'Compensation not listed')};
    const data=await api('/api/jobs',{method:'POST',body:JSON.stringify(payload)}).catch(()=>null);
    if (data?.job) { state.jobs.unshift(data.job); showToast('Published — job is live now.'); }
    else { const fallback={...payload,id:'job-local-'+Date.now(),companySlug:String(payload.company).toLowerCase().replace(/[^a-z0-9]+/g,'-'),postedAt:new Date().toISOString(),applicants:0,views:0,status:'Active',currency:'USD',companyRating:0,equity:null,verified:false,applyUrl:payload.applyMode==='internal'?`#apply/job-local-${Date.now()}`:payload.applyUrl}; state.jobs.unshift(fallback); showToast('Published locally — no payment or verification required.'); }
    state.employer={step:1,draft:{}}; location.hash='#job/'+encodeURIComponent(state.jobs[0].id);
  }

  function openModal(content) {
    const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<div class="modal"><div class="modal-head"><h2>${content.title}</h2><button class="close" data-action="close-modal" aria-label="Close">×</button></div>${content.body}</div>`; document.body.appendChild(wrap); wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()}); return wrap;
  }

  async function applyToJob(id) {
    const job=state.jobs.find(j=>j.id===id); if(!job)return;
    if (safeExternalUrl(job.applyUrl)) { window.open(safeExternalUrl(job.applyUrl),'_blank','noopener'); return; }
    const modal=openModal({title:`Apply — ${esc(job.title)}`,body:`<div class="notice">No ID or verification is requested. We only ask for an email so the employer can reply.</div><div class="form-grid" style="margin-top:12px"><div><label class="label">Name / alias</label><input id="apply-name" class="field" placeholder="Your name"></div><div><label class="label">Email *</label><input id="apply-email" class="field" type="email" placeholder="you@example.com"></div><div class="full"><label class="label">Resume / portfolio link</label><input id="apply-resume" class="field" placeholder="https://..."></div><div class="full"><label class="label">Message</label><textarea id="apply-note" class="field" rows="5" placeholder="Why are you a fit?"></textarea></div></div><div style="margin-top:12px"><button class="btn btn-primary" data-action="submit-application" data-id="${esc(id)}">Send application</button></div>`});
    modal.dataset.jobId=id;
  }

  async function submitApplication(modal,id) {
    const body={jobId:id,candidateName:$('#apply-name',modal)?.value,email:$('#apply-email',modal)?.value,resumeUrl:$('#apply-resume',modal)?.value,note:$('#apply-note',modal)?.value};
    const data=await api('/api/applications',{method:'POST',body:JSON.stringify(body)}).catch(()=>null);
    const localApp={id:'local-app-'+Date.now(),...body,status:'Applied',createdAt:new Date().toISOString()};
    if(data){state.applications.unshift(data);}else{state.applications.unshift(localApp);localStorage.setItem('nichepulse_applications',JSON.stringify(state.applications));}
    const job=state.jobs.find(j=>j.id===id); if(job)job.applicants=Number(job.applicants||0)+1;
    modal.remove(); showToast('Application sent.');
    location.hash='#applications';
  }

  async function handleAction(e) {
    const el=e.target.closest('[data-action]'); if(!el)return;
    const action=el.dataset.action;
    if(action==='toggle-mobile'){const m=$('#mobile-nav');m.classList.toggle('hidden');return;}
    if(action==='run-search'){state.search.q=$('#search-q')?.value.trim()||'';state.search.location=$('#search-location')?.value.trim()||'';location.hash='#jobs';return render();}
    if(action==='toggle-filter'){state.search[el.dataset.filter]=!state.search[el.dataset.filter];return render();}
    if(action==='set-date'){state.search.date=el.dataset.value;return render();}
    if(action==='toggle-filters'){$('#advanced-filters')?.classList.toggle('hidden');return;}
    if(action==='clear-filters'){state.search={q:'',location:'',remote:false,hybrid:false,onsite:false,under10:false,types:[],categories:[],experiences:[],minSalary:0,maxSalary:300000,date:'any',easyApply:false,sort:'relevance',savedOnly:false,viewedOnly:false};return render();}
    if(action==='apply-advanced'){state.search.types=$$('[data-filter-type="type"]:checked').map(x=>x.value);state.search.experiences=$$('[data-filter-type="experience"]:checked').map(x=>x.value);state.search.categories=$$('[data-filter-type="category"]:checked').map(x=>x.value);state.search.minSalary=Number($('#min-salary')?.value)||0;state.search.maxSalary=Number($('#max-salary')?.value)||300000;return render();}
    if(action==='toggle-save'){const id=el.dataset.id;state.saved.has(id)?state.saved.delete(id):state.saved.add(id);persistLocal();showToast(state.saved.has(id)?'Saved job.':'Removed from saved jobs.');return render();}
    if(action==='show-saved'){state.search.q='';state.search.location='';state.search.remote=false;state.search.hybrid=false;state.search.onsite=false;state.search.under10=false;state.search.types=[];state.search.categories=[];state.search.experiences=[];state.search.minSalary=0;state.search.maxSalary=300000;state.search.date='any';state.search.easyApply=false;state.search.savedOnly=true;state.search.viewedOnly=false;location.hash='#jobs';showToast('Showing saved jobs.');return render();}
    if(action==='show-viewed'){state.search.q='';state.search.location='';state.search.remote=false;state.search.hybrid=false;state.search.onsite=false;state.search.under10=false;state.search.types=[];state.search.categories=[];state.search.experiences=[];state.search.minSalary=0;state.search.maxSalary=300000;state.search.date='any';state.search.easyApply=false;state.search.savedOnly=false;state.search.viewedOnly=true;location.hash='#jobs';showToast('Showing recently viewed jobs.');return render();}
    if(action==='create-alert'){return createAlert();}
    if(action==='apply'){return applyToJob(el.dataset.id);}
    if(action==='report'){return reportJob(el.dataset.id);}
    if(action==='open-review'){return openReview(el.dataset.company);}
    if(action==='close-modal'){el.closest('.modal-backdrop')?.remove();return;}
    if(action==='submit-application'){return submitApplication(el.closest('.modal-backdrop'),el.dataset.id);}
    if(action==='save-profile'){state.profile={name:$('#profile-name')?.value||'',email:$('#profile-email')?.value||'',headline:$('#profile-headline')?.value||'',location:$('#profile-location')?.value||'',skills:$('#profile-skills')?.value||'',about:$('#profile-about')?.value||'',openToWork:$('#profile-open')?.checked!==false,public:$('#profile-public')?.checked!==false,portfolio:$('#profile-url')?.value||''};persistLocal();showToast('Profile saved locally.');return;}
    if(action==='delete-alert'){state.alerts=state.alerts.filter(a=>a.id!==el.dataset.id);persistLocal();return render();}
    if(action==='employer-next'){readEmployerStep();state.employer.step=Math.min(3,state.employer.step+1);return render();}
    if(action==='employer-back'){readEmployerStep();state.employer.step=Math.max(1,state.employer.step-1);return render();}
    if(action==='publish-job'){return publishEmployerJob();}
    if(action==='toggle-job-status'){const id=el.dataset.id;const job=state.jobs.find(j=>j.id===id);if(!job)return;const status=job.status==='Active'?'Filled':'Active';const data=await api('/api/jobs/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status})}).catch(()=>null);job.status=data?.status||status;showToast('Listing status updated.');return render();}
    if(action==='delete-job'){if(!confirm('Delete this listing?'))return;const id=el.dataset.id;await api('/api/jobs/'+encodeURIComponent(id),{method:'DELETE'}).catch(()=>null);state.jobs=state.jobs.filter(j=>j.id!==id);showToast('Listing deleted.');return render();}
    if(action==='advance-application'){const id=el.dataset.id;const data=state.applications.find(a=>a.id===id);if(!data)return;const order=['Applied','Screening','Interview','Offer','Hired'];const i=order.indexOf(data.status);data.status=order[Math.min(order.length-1,i+1)];await api('/api/applications/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:data.status})}).catch(()=>null);return render();}
    if(action==='demo-candidates'){location.hash='#candidates';return;}
    if(action==='message-candidate'){const name=el.dataset.name;showToast(`Message composer opened for ${name}.`);return openModal({title:`Message ${esc(name)}`,body:`<textarea id="candidate-msg" class="field" rows="7" placeholder="Write a short introduction..."></textarea><div style="margin-top:12px"><button class="btn btn-primary" data-action="close-modal">Send message</button></div>`});}
  }

  function createAlert(){const modal=openModal({title:'Create job alert',body:`<div class="form-grid"><div><label class="label">Keywords</label><input id="alert-q" class="field" value="${esc(state.search.q)}" placeholder="Solidity engineer"></div><div><label class="label">Location</label><input id="alert-location" class="field" value="${esc(state.search.location)}" placeholder="Remote"></div><div><label class="label">Frequency</label><select id="alert-frequency" class="field"><option>Daily</option><option>Weekly</option></select></div><div><label class="check"><input id="alert-remote" type="checkbox" ${state.search.remote?'checked':''}> Remote only</label></div></div><div style="margin-top:12px"><button class="btn btn-primary" data-action="save-alert">Save alert</button></div>`}); modal.addEventListener('click',async e=>{const b=e.target.closest('[data-action="save-alert"]');if(!b)return;state.alerts.unshift({id:'alert-'+Date.now(),q:$('#alert-q',modal)?.value||'',location:$('#alert-location',modal)?.value||'',frequency:$('#alert-frequency',modal)?.value||'Daily',remote:$('#alert-remote',modal)?.checked||false});persistLocal();modal.remove();showToast('Alert saved.');});}

  async function reportJob(id){const modal=openModal({title:'Report listing',body:`<label class="label">Reason</label><select id="report-reason" class="field"><option>Spam</option><option>Scam</option><option>Misleading compensation</option><option>Abusive or illegal content</option><option>Other</option></select><div style="margin-top:12px"><button class="btn btn-primary" data-action="submit-report">Submit report</button></div>`});modal.addEventListener('click',async e=>{const b=e.target.closest('[data-action="submit-report"]');if(!b)return;await api('/api/reports',{method:'POST',body:JSON.stringify({jobId:id,reason:$('#report-reason',modal)?.value})}).catch(()=>null);modal.remove();showToast('Report submitted.');});}

  async function openReview(slug){const modal=openModal({title:'Write a company review',body:`<div class="form-grid"><div><label class="label">Rating</label><select id="review-rating" class="field"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div><div><label class="label">Title</label><input id="review-title" class="field" placeholder="Great team"></div><div class="full"><label class="label">Review</label><textarea id="review-body" class="field" rows="6" placeholder="Share your experience."></textarea></div></div><button class="btn btn-primary" data-action="submit-review">Publish review</button>`});modal.addEventListener('click',async e=>{const b=e.target.closest('[data-action="submit-review"]');if(!b)return;const body={rating:Number($('#review-rating',modal)?.value),title:$('#review-title',modal)?.value,body:$('#review-body',modal)?.value};const data=await api('/api/companies/'+encodeURIComponent(slug),{method:'POST',body:JSON.stringify(body)}).catch(()=>null);if(!data)return showToast('Review could not be saved in offline mode.');modal.remove();showToast('Review published.');return render();});}

  document.addEventListener('click', handleAction);
  document.addEventListener('change', e=>{if(e.target.id==='sort-select'){state.search.sort=e.target.value;render();}if(e.target.dataset.filterQuick==='remote'){state.search.remote=e.target.checked;render();}if(e.target.dataset.filterQuick==='easyApply'){state.search.easyApply=e.target.checked;render();}if(e.target.dataset.filterQuick==='hybrid'){state.search.hybrid=e.target.checked;render();}if(e.target.dataset.filterQuick==='onsite'){state.search.onsite=e.target.checked;render();}if(e.target.dataset.filterQuick==='under10'){state.search.under10=e.target.checked;render();}});
  window.addEventListener('hashchange', render);
  render();
})();
