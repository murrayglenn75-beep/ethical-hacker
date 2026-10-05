const {evaluatePolicies}=require('./policy');

function normalizeConfidence(f){
  return String(f?.confidence||'CONFIRMED').toUpperCase();
}

function isBlockingFinding(f){
  const severity=String(f?.severity||'').toUpperCase();
  const confidence=normalizeConfidence(f);

  if(severity==='CRITICAL'){
    return confidence==='CONFIRMED' || confidence==='PROBABLE';
  }

  if(severity==='HIGH'){
    return confidence==='CONFIRMED';
  }

  return false;
}

function runBuildGate({
  engine,
  policies=[],
  policyContext={},
  graph,
  diff,
  thresholds={
    maxCritical:0,
    maxHigh:2,
    maxRiskScore:20,
    warnOnHighAttackChain:true,
    failOnCriticalAttackChain:false,
    failOnRiskIncrease:false
  }
}){
  const findings=engine.getFindings();
  const summary=engine.getRiskSummary();
  const policy=evaluatePolicies(policies,policyContext);
  const chains=graph?graph.attackChains():[];

  const critical=findings.filter(
    f=>String(f.severity).toUpperCase()==='CRITICAL'
  ).length;

  const high=findings.filter(
    f=>String(f.severity).toUpperCase()==='HIGH'
  ).length;

  const blockingFindings=findings.filter(isBlockingFinding);

  const confirmedCritical=blockingFindings.filter(
    f=>String(f.severity).toUpperCase()==='CRITICAL'
  ).length;

  const confirmedHigh=blockingFindings.filter(
    f=>String(f.severity).toUpperCase()==='HIGH'
  ).length;

  const failReasons=[];
  const warnReasons=[];
  const reasonCodes=[];

  if(critical>thresholds.maxCritical){
    failReasons.push(
      `${critical} critical findings exceed ${thresholds.maxCritical}`
    );
    reasonCodes.push('CRITICAL_THRESHOLD_EXCEEDED');
  }

  if(high>thresholds.maxHigh){
    failReasons.push(
      `${high} high findings exceed ${thresholds.maxHigh}`
    );
    reasonCodes.push('HIGH_THRESHOLD_EXCEEDED');
  }

  if(summary.score>thresholds.maxRiskScore){
    failReasons.push(
      `risk score ${summary.score} exceeds ${thresholds.maxRiskScore}`
    );
    reasonCodes.push('RISK_SCORE_EXCEEDED');
  }

  if(confirmedCritical>0){
    failReasons.push(
      `${confirmedCritical} blocking critical finding(s)`
    );
    reasonCodes.push('CONFIRMED_CRITICAL_FINDING');
  }

  if(confirmedHigh>0){
    failReasons.push(
      `${confirmedHigh} confirmed high finding(s)`
    );
    reasonCodes.push('CONFIRMED_HIGH_FINDING');
  }

  if(!policy.passed){
    failReasons.push(
      `${policy.failures.length} policy rule(s) failed`
    );
    reasonCodes.push('POLICY_FAILURE');
  }

  if(diff?.riskIncrease>0){
    if(thresholds.failOnRiskIncrease){
      failReasons.push(
        `${diff.riskIncrease} new high-risk graph edge(s)`
      );
      reasonCodes.push('RELEASE_RISK_INCREASE');
    }else{
      warnReasons.push(
        `${diff.riskIncrease} new high-risk graph edge(s)`
      );
      reasonCodes.push('RELEASE_RISK_INCREASE');
    }
  }

  const criticalChains=chains.filter(
    c=>String(c.risk).toUpperCase()==='CRITICAL'
  );

  const highChains=chains.filter(
    c=>String(c.risk).toUpperCase()==='HIGH'
  );

  if(
    criticalChains.length>0 &&
    thresholds.failOnCriticalAttackChain
  ){
    failReasons.push(
      `${criticalChains.length} critical attack chain(s) detected`
    );
    reasonCodes.push('CRITICAL_ATTACK_CHAIN');
  }else if(criticalChains.length>0){
    warnReasons.push(
      `${criticalChains.length} critical attack chain(s) detected`
    );
    reasonCodes.push('CRITICAL_ATTACK_CHAIN');
  }

  if(
    highChains.length>0 &&
    thresholds.warnOnHighAttackChain
  ){
    warnReasons.push(
      `${highChains.length} high-risk attack chain(s) detected`
    );
    reasonCodes.push('HIGH_ATTACK_CHAIN');
  }

  let status='PASS';

  if(failReasons.length){
    status='FAIL';
  }else if(warnReasons.length){
    status='WARN';
  }

  return {
    status,
    legacyStatus:status==='FAIL'?'BLOCK':'PASS',
    reasons:[...failReasons,...warnReasons],
    failReasons,
    warnReasons,
    reasonCodes:[...new Set(reasonCodes)],
    summary,
    critical,
    high,
    blocking:{
      critical:confirmedCritical,
      high:confirmedHigh,
      total:blockingFindings.length
    },
    policy,
    attackChains:chains.slice(0,20),
    releaseDiff:diff||null
  };
}

module.exports={
  runBuildGate,
  isBlockingFinding
};
