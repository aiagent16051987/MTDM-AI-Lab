import registry from "./knowledge-registry.json" with { type: "json" };

const byId = id => document.getElementById(id);
const search = byId("knowledgeSearch");
const domain = byId("knowledgeDomain");
const results = byId("knowledgeResults");
const providers = byId("providerResults");
const count = byId("knowledgeCount");
const empty = byId("knowledgeEmpty");
if (search && domain && results && providers) {
  const make = (tag, cls, value) => { const el=document.createElement(tag); if(cls)el.className=cls; if(value!==undefined)el.textContent=value; return el; };
  const safeLink = (url, label) => { const a=make("a","",label); a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; return a; };
  const renderSources = () => {
    const q=search.value.trim().toLowerCase();
    const list=registry.sources.filter(s=>(domain.value==="all"||s.domain===domain.value) && [s.title,s.publisher,s.domain,...s.topics].join(" ").toLowerCase().includes(q));
    results.replaceChildren();
    for(const s of list){
      const card=make("article","knowledge-card");
      const meta=make("div","knowledge-meta");
      meta.append(make("span","knowledge-domain",s.domain),make("span","knowledge-review","Reviewed "+registry.reviewedOn));
      card.append(meta,make("b","",s.title),make("p","",s.publisher+" · "+s.topics.join(" · ")),safeLink(s.url,"Open official resource ↗"));
      results.append(card);
    }
    count.textContent=list.length+" / "+registry.sources.length+" SOURCES";
    empty.hidden=list.length!==0;
  };
  for(const p of registry.providers){
    const card=make("article","provider-card");
    card.append(make("span","provider-type",p.type),make("b","",p.name),make("span","provider-status","NOT CONNECTED · USER AUTHORIZATION REQUIRED"),make("p","",p.policy),safeLink(p.url,"Official documentation ↗"));
    providers.append(card);
  }
  search.addEventListener("input",renderSources);
  domain.addEventListener("change",renderSources);
  renderSources();
}
