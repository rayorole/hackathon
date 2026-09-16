import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchTargets} from '../../../scripts/lib/web-discovery';
import {isPublicV4} from '../../../scripts/lib/discovery';
import {matchesLocalIdentity} from '../../../scripts/lib/research';
import {createFixtures} from '../src/fixtures';
test('search accepts actual citations only, rejecting invented plain text links and credential URLs',()=>{
 const output=[{content:[{annotations:[{type:'url_citation',url:'https://example.be/contact',title:'Source'},{type:'url_citation',url:'http://example.be'},{type:'url_citation',url:'https://secret@example.be'}]}]}];
 assert.deepEqual(searchTargets({output}).map(x=>x.url),['https://example.be/contact']);
 assert.deepEqual(searchTargets({output:[]}),[]);
});
test('discovered sources cannot resolve to private, loopback or reserved IPv4 ranges',()=>{
 for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','172.16.0.1','100.64.0.1','0.0.0.0','224.0.0.1','::1'])assert.equal(isPublicV4(address),false,address);
 assert.equal(isPublicV4('93.184.216.34'),true);
});
test('a parent brand or neighbouring house cannot substitute for the local business identity',()=>{
 const d=createFixtures()[0];
 d.establishment.name='Phase Eight';d.establishment.address={street:'Bredabaan',houseNumber:'967',postalCode:'2900',municipality:'Schoten'};
 assert.equal(matchesLocalIdentity('Phase Eight Bredabaan 967 2900 Schoten',d),true);
 assert.equal(matchesLocalIdentity('INNO Bredabaan 967 2900 Schoten',d),false);
 assert.equal(matchesLocalIdentity('Phase Eight Bredabaan 9670 2900 Schoten',d),false);
 assert.equal(matchesLocalIdentity('Phase Eight Bredabaan 967 Antwerpen',d),false);
});

import {validFieldValue} from '../../../scripts/lib/source-analysis';
test('UI labels cannot masquerade as contact facts',()=>{
 assert.equal(validFieldValue('email','E-mail'),false);
 assert.equal(validFieldValue('email','contact@example.be'),true);
 assert.equal(validFieldValue('telephone','Bellen'),false);
 assert.equal(validFieldValue('openingHours','Openingsuren'),false);
});
test('generic multi-company category pages are not source candidates',()=>{
 assert.deepEqual(searchTargets({output:[{action:{sources:[{url:'https://goldenpages.be/companies/Schoten/manicure/'}]}}]}),[]);
});
