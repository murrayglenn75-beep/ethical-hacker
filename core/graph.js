class SecurityGraph {
  constructor(){ this.nodes=new Map(); this.edges=[]; }
  addNode(node){ this.nodes.set(node.id,{...node}); return this; }
  addEdge(edge){ this.edges.push({...edge}); return this; }
  neighbors(id){ return this.edges.filter(e=>e.from===id).map(e=>({edge:e,node:this.nodes.get(e.to)})); }
  blastRadius(start,{maxDepth=6}={}){
    const q=[{id:start,depth:0,path:[start]}], seen=new Set([start]), paths=[];
    while(q.length){
      const cur=q.shift();
      if(cur.depth>=maxDepth) continue;
      for(const {edge,node} of this.neighbors(cur.id)){
        if(!node) continue;
        const path=[...cur.path,node.id];
        paths.push({path,via:edge.kind||'relation',risk:edge.risk||'MEDIUM'});
        if(!seen.has(node.id)){ seen.add(node.id); q.push({id:node.id,depth:cur.depth+1,path}); }
      }
    }
    const assets=[...seen].slice(1).map(id=>this.nodes.get(id)).filter(Boolean);
    const critical=assets.filter(n=>n.criticality==='CRITICAL'||n.criticality==='HIGH');
    return {start,reachable:assets.length,criticalReachable:critical.length,assets,paths};
  }
  attackChains({minLength=3,maxDepth=6}={}){
    const chains=[];
    for(const start of this.nodes.keys()){
      const dfs=(id,path,depth)=>{
        if(depth>maxDepth) return;
        for(const {edge,node} of this.neighbors(id)){
          if(!node||path.includes(node.id)) continue;
          const next=[...path,node.id];
          if(next.length>=minLength && (edge.risk==='HIGH'||edge.risk==='CRITICAL'||node.criticality==='CRITICAL')) chains.push({path:next,risk:edge.risk||node.criticality||'MEDIUM'});
          dfs(node.id,next,depth+1);
        }
      };
      dfs(start,[start],0);
    }
    return chains;
  }
  toJSON(){ return {nodes:[...this.nodes.values()],edges:[...this.edges]}; }
}
module.exports={SecurityGraph};
