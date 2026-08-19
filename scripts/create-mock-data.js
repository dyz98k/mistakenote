const { getDb } = require('../src/db');
const bcrypt = require('bcryptjs');

async function createMockData() {
  console.log('开始创建 mock 数据...\n');

  const db = await getDb();

  // 1. 创建测试用户
  console.log('创建测试用户...');
  const testUsers = [
    {
      id: 'user001',
      username: 'student1',
      password: bcrypt.hashSync('123456', 10),
      email: 'student1@test.com',
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7天前
      points: 5000,
      streak: 7,
      lastActiveDate: Date.now()
    },
    {
      id: 'user002',
      username: 'student2',
      password: bcrypt.hashSync('123456', 10),
      email: 'student2@test.com',
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3天前
      points: 12000,
      streak: 3,
      lastActiveDate: Date.now()
    },
    {
      id: 'user003',
      username: 'teacher',
      password: bcrypt.hashSync('123456', 10),
      email: 'teacher@test.com',
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30天前
      points: 35000,
      streak: 30,
      lastActiveDate: Date.now()
    }
  ];

  // 检查用户是否已存在
  testUsers.forEach(user => {
    const exists = db.data.users.find(u => u.username === user.username);
    if (!exists) {
      db.data.users.push(user);
      console.log(`  ✓ 创建用户: ${user.username} (密码: 123456)`);
    } else {
      console.log(`  - 用户已存在: ${user.username}`);
    }
  });

  // 2. 创建测试错题
  console.log('\n创建测试错题...');
  const testMistakes = [
    {
      id: 'mistake001',
      userId: 'user001',
      image: null,
      subject: '高等数学',
      chapter: '第一章 函数与极限',
      difficulty: '困难',
      note: '求极限 lim x->0 sin(x)/x 的值，忘记使用洛必达法则',
      createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
      reviewed: true,
      reviewCount: 3
    },
    {
      id: 'mistake002',
      userId: 'user001',
      image: null,
      subject: '高等数学',
      chapter: '第二章 导数与微分',
      difficulty: '中等',
      note: '求函数 f(x) = x^3 + 2x^2 - 3x + 1 的导数',
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      reviewed: false,
      reviewCount: 0
    },
    {
      id: 'mistake003',
      userId: 'user001',
      image: null,
      subject: '线性代数',
      chapter: '第二章 矩阵',
      difficulty: '困难',
      note: '矩阵乘法运算错误，忘记矩阵乘法不满足交换律',
      createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      reviewed: true,
      reviewCount: 2
    },
    {
      id: 'mistake004',
      userId: 'user001',
      image: null,
      subject: '大学物理',
      chapter: '第一章 力学',
      difficulty: '中等',
      note: '牛顿第二定律应用题，受力分析不完整',
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      reviewed: false,
      reviewCount: 0
    },
    {
      id: 'mistake005',
      userId: 'user001',
      image: null,
      subject: '英语',
      chapter: 'Unit 2',
      difficulty: '简单',
      note: '虚拟语气用法错误，should have done 表示本该做而没做',
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      reviewed: true,
      reviewCount: 1
    },
    {
      id: 'mistake006',
      userId: 'user001',
      image: null,
      subject: '计算机基础',
      chapter: '第三章 计算机网络',
      difficulty: '中等',
      note: 'TCP三次握手过程理解不清晰',
      createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      reviewed: false,
      reviewCount: 0
    },
    {
      id: 'mistake007',
      userId: 'user002',
      image: null,
      subject: '高等数学',
      chapter: '第三章 积分学',
      difficulty: '困难',
      note: '不定积分计算错误，忘记常数C',
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      reviewed: false,
      reviewCount: 0
    },
    {
      id: 'mistake008',
      userId: 'user003',
      image: null,
      subject: '高等数学',
      chapter: '第一章 函数与极限',
      difficulty: '中等',
      note: '泰勒展开公式记忆错误',
      createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      reviewed: true,
      reviewCount: 5
    }
  ];

  testMistakes.forEach(mistake => {
    const exists = db.data.mistakes.find(m => m.id === mistake.id);
    if (!exists) {
      db.data.mistakes.push(mistake);
      console.log(`  ✓ 创建错题: ${mistake.subject} - ${mistake.note.substring(0, 20)}...`);
    } else {
      console.log(`  - 错题已存在: ${mistake.id}`);
    }
  });

  // 3. 创建徽章奖励
  console.log('\n创建徽章奖励...');
  const testBadges = [
    {
      id: 'badge001',
      userId: 'user001',
      badge: '坚持不懈',
      earnedAt: Date.now() - 3 * 24 * 60 * 60 * 1000
    },
    {
      id: 'badge002',
      userId: 'user001',
      badge: '一周达人',
      earnedAt: Date.now() - 1 * 24 * 60 * 60 * 1000
    },
    {
      id: 'badge003',
      userId: 'user001',
      badge: '错题能手',
      earnedAt: Date.now() - 2 * 24 * 60 * 60 * 1000
    },
    {
      id: 'badge004',
      userId: 'user003',
      badge: '坚持不懈',
      earnedAt: Date.now() - 3 * 24 * 60 * 60 * 1000
    },
    {
      id: 'badge005',
      userId: 'user003',
      badge: '一周达人',
      earnedAt: Date.now() - 7 * 24 * 60 * 60 * 1000
    },
    {
      id: 'badge006',
      userId: 'user003',
      badge: '月冠军',
      earnedAt: Date.now() - 1 * 24 * 60 * 60 * 1000
    },
    {
      id: 'badge007',
      userId: 'user003',
      badge: '错题大师',
      earnedAt: Date.now() - 10 * 24 * 60 * 60 * 1000
    },
    {
      id: 'badge008',
      userId: 'user003',
      badge: '学霸养成',
      earnedAt: Date.now() - 5 * 24 * 60 * 60 * 1000
    }
  ];

  testBadges.forEach(badge => {
    const exists = db.data.userRewards.find(b => b.id === badge.id);
    if (!exists) {
      db.data.userRewards.push(badge);
      console.log(`  ✓ 创建徽章: ${badge.badge}`);
    } else {
      console.log(`  - 徽章已存在: ${badge.id}`);
    }
  });

  await db.write();

  console.log('\n✅ Mock 数据创建完成！');
  console.log('\n📝 测试账号信息：');
  console.log('  账号1: student1 / 123456 (150积分, 7天连续, 6道错题)');
  console.log('  账号2: student2 / 123456 (80积分, 3天连续, 1道错题)');
  console.log('  账号3: teacher / 123456 (500积分, 30天连续, 1道错题)');
  console.log('\n🤖 AI 功能测试：');
  console.log('  如果没有配置 OPENAI_API_KEY，AI 会返回提示信息');
  console.log('  如需使用真实 AI 功能，请在 .env 文件中配置 API Key');
}

// 运行脚本
createMockData().catch(console.error);