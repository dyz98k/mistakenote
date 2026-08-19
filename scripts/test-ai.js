const fetch = require('node-fetch');

async function test() {
  console.log('测试 AI 问答功能...\n');
  
  // 登录
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'student1', password: '123456' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('登录成功！Token:', token.substring(0, 20) + '...');
  
  // 测试问候语
  console.log('\n--- 测试1：问候语 ---');
  const askRes1 = await fetch('http://localhost:3000/api/ai/ask', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question: '你好' })
  });
  const askData1 = await askRes1.json();
  console.log('问：你好');
  console.log('答：', askData1.answer);
  
  // 测试泰勒展开
  console.log('\n--- 测试2：泰勒展开 ---');
  const askRes2 = await fetch('http://localhost:3000/api/ai/ask', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question: '什么是泰勒展开？' })
  });
  const askData2 = await askRes2.json();
  console.log('问：什么是泰勒展开？');
  console.log('答：', askData2.answer.substring(0, 200) + '...');
  
  // 测试极限
  console.log('\n--- 测试3：极限 ---');
  const askRes3 = await fetch('http://localhost:3000/api/ai/ask', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question: '如何计算极限？' })
  });
  const askData3 = await askRes3.json();
  console.log('问：如何计算极限？');
  console.log('答：', askData3.answer.substring(0, 200) + '...');
  
  // 测试矩阵
  console.log('\n--- 测试4：矩阵 ---');
  const askRes4 = await fetch('http://localhost:3000/api/ai/ask', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question: '矩阵乘法怎么算？' })
  });
  const askData4 = await askRes4.json();
  console.log('问：矩阵乘法怎么算？');
  console.log('答：', askData4.answer.substring(0, 200) + '...');
  
  // 测试牛顿定律
  console.log('\n--- 测试5：牛顿定律 ---');
  const askRes5 = await fetch('http://localhost:3000/api/ai/ask', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question: '牛顿第二定律是什么？' })
  });
  const askData5 = await askRes5.json();
  console.log('问：牛顿第二定律是什么？');
  console.log('答：', askData5.answer.substring(0, 200) + '...');
  
  // 测试英语语法
  console.log('\n--- 测试6：英语语法 ---');
  const askRes6 = await fetch('http://localhost:3000/api/ai/ask', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question: '英语时态有哪些？' })
  });
  const askData6 = await askRes6.json();
  console.log('问：英语时态有哪些？');
  console.log('答：', askData6.answer.substring(0, 200) + '...');
  
  // 测试错题分析
  console.log('\n--- 测试7：错题分析 ---');
  const analyzeRes = await fetch('http://localhost:3000/api/ai/analyze', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ text: '求极限 lim x->0 sin(x)/x，忘记使用洛必达法则' })
  });
  const analyzeData = await analyzeRes.json();
  console.log('分析：求极限 lim x->0 sin(x)/x');
  console.log('结果：', analyzeData.analysis.substring(0, 200) + '...');
  
  console.log('\n✅ 所有测试完成！');
}

test().catch(console.error);