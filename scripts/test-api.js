// 测试脚本 - 测试登录注册和 AI 问答功能
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

let authToken = null;
let currentUser = null;

// 辅助函数：打印结果
function printResult(testName, success, data) {
  console.log(`\n${success ? '✅' : '❌'} ${testName}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// 1. 测试用户注册
async function testRegister(username, password, email) {
  console.log('\n📝 测试用户注册...');
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });
    const data = await response.json();
    if (response.ok) {
      printResult(`注册用户: ${username}`, true, { 
        success: data.success, 
        user: data.user,
        hasToken: !!data.token 
      });
      return data;
    } else {
      printResult(`注册用户: ${username}`, false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult(`注册用户: ${username}`, false, { error: error.message });
    return null;
  }
}

// 2. 测试用户登录
async function testLogin(username, password) {
  console.log('\n🔐 测试用户登录...');
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok) {
      authToken = data.token;
      currentUser = data.user;
      printResult(`登录用户: ${username}`, true, { 
        success: data.success, 
        user: data.user,
        hasToken: !!data.token 
      });
      return data;
    } else {
      printResult(`登录用户: ${username}`, false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult(`登录用户: ${username}`, false, { error: error.message });
    return null;
  }
}

// 3. 测试获取用户信息
async function testGetProfile() {
  console.log('\n👤 测试获取用户信息...');
  if (!authToken) {
    printResult('获取用户信息', false, { error: '未登录，请先登录' });
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      printResult('获取用户信息', true, data);
      return data;
    } else {
      printResult('获取用户信息', false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult('获取用户信息', false, { error: error.message });
    return null;
  }
}

// 4. 测试获取学科列表
async function testGetSubjects() {
  console.log('\n📚 测试获取学科列表...');
  if (!authToken) {
    printResult('获取学科列表', false, { error: '未登录，请先登录' });
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/subjects`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      printResult('获取学科列表', true, { 
        subjectsCount: data.data.subjects.length,
        subjects: data.data.subjects 
      });
      return data;
    } else {
      printResult('获取学科列表', false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult('获取学科列表', false, { error: error.message });
    return null;
  }
}

// 5. 测试获取错题列表
async function testGetMistakes() {
  console.log('\n📝 测试获取错题列表...');
  if (!authToken) {
    printResult('获取错题列表', false, { error: '未登录，请先登录' });
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/mistakes`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      printResult('获取错题列表', true, { 
        total: data.total,
        mistakesCount: data.data.length 
      });
      return data;
    } else {
      printResult('获取错题列表', false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult('获取错题列表', false, { error: error.message });
    return null;
  }
}

// 6. 测试创建错题
async function testCreateMistake(subject, chapter, note) {
  console.log('\n➕ 测试创建错题...');
  if (!authToken) {
    printResult('创建错题', false, { error: '未登录，请先登录' });
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/mistakes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ subject, chapter, difficulty: '中等', note })
    });
    const data = await response.json();
    if (response.ok) {
      printResult('创建错题', true, { 
        id: data.data.id,
        subject: data.data.subject,
        chapter: data.data.chapter 
      });
      return data;
    } else {
      printResult('创建错题', false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult('创建错题', false, { error: error.message });
    return null;
  }
}

// 7. 测试 AI 问答
async function testAIAsk(question) {
  console.log('\n🤖 测试 AI 问答...');
  if (!authToken) {
    printResult('AI 问答', false, { error: '未登录，请先登录' });
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/ai/ask`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ question })
    });
    const data = await response.json();
    if (response.ok) {
      printResult('AI 问答', true, { 
        source: data.source,
        answerLength: data.answer.length,
        answer: data.answer.substring(0, 100) + '...' 
      });
      return data;
    } else {
      printResult('AI 问答', false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult('AI 问答', false, { error: error.message });
    return null;
  }
}

// 8. 测试 AI 错题分析
async function testAIAnalyze(text) {
  console.log('\n🔍 测试 AI 错题分析...');
  if (!authToken) {
    printResult('AI 错题分析', false, { error: '未登录，请先登录' });
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    if (response.ok) {
      printResult('AI 错题分析', true, { 
        source: data.source,
        analysisLength: data.analysis.length,
        analysis: data.analysis.substring(0, 100) + '...' 
      });
      return data;
    } else {
      printResult('AI 错题分析', false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult('AI 错题分析', false, { error: error.message });
    return null;
  }
}

// 9. 测试获取奖励信息
async function testGetRewards() {
  console.log('\n🏆 测试获取奖励信息...');
  if (!authToken) {
    printResult('获取奖励信息', false, { error: '未登录，请先登录' });
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/rewards/my`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      printResult('获取奖励信息', true, data.data);
      return data;
    } else {
      printResult('获取奖励信息', false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult('获取奖励信息', false, { error: error.message });
    return null;
  }
}

// 10. 测试获取徽章列表
async function testGetBadges() {
  console.log('\n🎖️ 测试获取徽章列表...');
  if (!authToken) {
    printResult('获取徽章列表', false, { error: '未登录，请先登录' });
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/api/rewards/badges`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      const unlockedCount = data.data.filter(b => b.unlocked).length;
      printResult('获取徽章列表', true, { 
        total: data.data.length,
        unlocked: unlockedCount 
      });
      return data;
    } else {
      printResult('获取徽章列表', false, { error: data.error });
      return null;
    }
  } catch (error) {
    printResult('获取徽章列表', false, { error: error.message });
    return null;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试错题本应用...\n');
  console.log('='.repeat(50));

  // 测试注册新用户
  await testRegister('testuser_new', '123456', 'new@test.com');

  // 测试使用 mock 数据登录
  await testLogin('student1', '123456');

  // 测试获取用户信息
  await testGetProfile();

  // 测试获取学科列表
  await testGetSubjects();

  // 测试获取错题列表
  await testGetMistakes();

  // 测试创建错题
  await testCreateMistake('高等数学', '第一章 函数与极限', '求极限 lim x->∞ (1+1/x)^x');

  // 测试 AI 问答
  await testAIAsk('什么是泰勒展开？');

  // 测试 AI 错题分析
  await testAIAnalyze('求极限 lim x->0 sin(x)/x，忘记使用洛必达法则');

  // 测试获取奖励信息
  await testGetRewards();

  // 测试获取徽章列表
  await testGetBadges();

  // 测试登录另一个用户
  await testLogin('teacher', '123456');
  await testGetProfile();
  await testGetBadges();

  console.log('\n' + '='.repeat(50));
  console.log('✅ 所有测试完成！');
  console.log('\n💡 提示：');
  console.log('  - AI 功能需要配置 OPENAI_API_KEY 才能正常工作');
  console.log('  - 可以在浏览器中访问 http://localhost:3000 查看完整应用');
  console.log('  - 使用测试账号：student1/123456, student2/123456, teacher/123456');
}

// 运行测试
runTests().catch(console.error);