const o=e=>e*10,x=e=>{let t=0;for(let l=1;l<=e;l++)t+=o(l);return t},u=e=>{if(e<=0)return{level:1,currentLevelExp:0,expForThisLevel:10};let t=1,l=0;for(;l+o(t)<=e;)l+=o(t),t++;const r=e-l,n=o(t);return{level:t,currentLevelExp:r,expForThisLevel:n}},c=(e,t)=>{const l=e.level,n=(e.totalExp||x(l-1)+e.exp)+t,{level:p,currentLevelExp:s,expForThisLevel:v}=u(n);return e.totalExp=n,e.level=p,e.exp=s,e.expToNextLevel=v,{leveledUp:p>l,newLevel:p,oldLevel:l}},L=(e,t,l)=>{const r=l-t;return r===1?`🎉 ${e} 升级了！

Level ${t} → Level ${l}

下一级需要经验：${o(l+1)}点`:r>1?`🎉🎉 ${e} 连升${r}级！

Level ${t} → Level ${l}

下一级需要经验：${o(l+1)}点`:""};export{u as calculateLevelFromExp,o as getExpForLevel,L as getLevelUpMessage,x as getTotalExpForLevel,c as processLevelUp};
