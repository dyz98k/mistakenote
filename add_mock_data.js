const http = require('http');

const BASE_URL = 'localhost';
const PORT = 8080;

function post(path, body, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: 'GET',
      headers: {}
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.end();
  });
}

async function main() {
  console.log('=== 重新添加模拟数据（正确关联学科） ===\n');
  
  // 登录
  console.log('1. 登录系统...');
  const login = await post('/api/auth/login', { username: 'admin', password: 'admin123' });
  const token = login.json.token;
  console.log('   ✅ 登录成功');
  
  // 获取所有学科并建立映射
  console.log('\n2. 获取学科列表...');
  const allSubjects = await get('/api/subjects', token);
  const subjectMap = {};
  allSubjects.json.forEach(s => {
    subjectMap[s.name] = s.id;
    console.log(`   - ${s.icon} ${s.name} (ID: ${s.id})`);
  });
  
  // 添加错题（正确关联学科）
  console.log('\n3. 添加模拟错题...');
  const mistakes = [
    {
      subjectName: '高中数学',
      chapter: '函数与导数',
      difficulty: '困难',
      question: '已知函数 f(x) = x³ - 3x² + 2，求函数的极值点和极值。',
      answer: '极大值点 x=0，极大值 f(0)=2；极小值点 x=2，极小值 f(2)=-2',
      analysis: '对 f(x) 求导得 f\'(x) = 3x² - 6x = 3x(x-2)。令 f\'(x)=0，解得 x=0 或 x=2。通过二阶导数判断：f\'\'(x)=6x-6，f\'\'(0)=-6<0，所以 x=0 是极大值点；f\'\'(2)=6>0，所以 x=2 是极小值点。',
      tags: '导数,极值,函数',
      errorType: '计算错误',
      errorPoint: '二阶导数判断极值类型时符号判断错误'
    },
    {
      subjectName: '高中数学',
      chapter: '三角函数',
      difficulty: '中等',
      question: '化简 sin²α + cos²α + tan²α - sec²α',
      answer: '0',
      analysis: '根据三角恒等式：sin²α + cos²α = 1，sec²α - tan²α = 1。所以原式 = 1 + tan²α - sec²α = 1 - (sec²α - tan²α) = 1 - 1 = 0',
      tags: '三角函数,恒等式',
      errorType: '公式记错',
      errorPoint: 'sec²α - tan²α = 1 记成了 tan²α - sec²α = 1'
    },
    {
      subjectName: '高中物理',
      chapter: '力学',
      difficulty: '困难',
      question: '一个质量为2kg的物体，在水平面上受到10N的水平推力作用，物体与地面的动摩擦因数为0.3，求物体的加速度。(g=10m/s²)',
      answer: 'a = 2 m/s²',
      analysis: '摩擦力 f = μN = μmg = 0.3 × 2 × 10 = 6N。根据牛顿第二定律 F - f = ma，所以 a = (F - f)/m = (10 - 6)/2 = 2 m/s²',
      tags: '牛顿定律,摩擦力,力学',
      errorType: '概念理解错误',
      errorPoint: '未正确计算摩擦力，把动摩擦因数当成了最大静摩擦因数'
    },
    {
      subjectName: '高中物理',
      chapter: '电磁学',
      difficulty: '中等',
      question: '一个电阻为10Ω的导体，通过2A的电流，1分钟产生多少热量？',
      answer: '2400J',
      analysis: '根据焦耳定律 Q = I²Rt = 2² × 10 × 60 = 4 × 10 × 60 = 2400J',
      tags: '焦耳定律,电磁学',
      errorType: '单位换算错误',
      errorPoint: '把时间1分钟当成了1秒计算'
    },
    {
      subjectName: '高中化学',
      chapter: '化学反应速率',
      difficulty: '中等',
      question: '在2L密闭容器中，反应 N₂ + 3H₂ ⇌ 2NH₃ 经过5min后，NH₃的物质的量增加了0.2mol，求NH₃的平均反应速率。',
      answer: '0.02 mol/(L·min)',
      analysis: '反应速率 v = Δc/Δt = (0.2mol/2L)/5min = 0.1/5 = 0.02 mol/(L·min)',
      tags: '反应速率,化学平衡',
      errorType: '计算错误',
      errorPoint: '忘记除以容器体积，直接用物质的量变化除以时间'
    },
    {
      subjectName: '高中化学',
      chapter: '有机化学',
      difficulty: '困难',
      question: '写出乙醇与乙酸反应生成乙酸乙酯的化学方程式，并注明反应类型。',
      answer: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O，酯化反应（取代反应）',
      analysis: '乙醇和乙酸在浓硫酸催化下发生酯化反应，生成乙酸乙酯和水。这是一个可逆反应，也是一种取代反应。',
      tags: '酯化反应,有机化学',
      errorType: '反应条件遗漏',
      errorPoint: '忘记写浓硫酸催化剂和加热条件'
    },
    {
      subjectName: '高中英语',
      chapter: '语法填空',
      difficulty: '简单',
      question: 'He suggested that we _____ (start) early the next morning.',
      answer: '(should) start',
      analysis: 'suggest 后面的宾语从句要用虚拟语气，谓语动词用 (should) + 动词原形',
      tags: '虚拟语气,suggest',
      errorType: '语法错误',
      errorPoint: '不知道suggest后接虚拟语气'
    },
    {
      subjectName: '高中英语',
      chapter: '完形填空',
      difficulty: '中等',
      question: 'The teacher insisted that every student _____ (finish) the homework on time.',
      answer: '(should) finish',
      analysis: 'insist 表示"坚持要求"时，后面的宾语从句用虚拟语气，谓语动词用 (should) + 动词原形',
      tags: '虚拟语气,insist',
      errorType: '语法错误',
      errorPoint: '把insist后的虚拟语气记成了陈述语气'
    },
    {
      subjectName: '高中语文',
      chapter: '文言文阅读',
      difficulty: '困难',
      question: '翻译句子："师者，所以传道受业解惑也。"',
      answer: '老师，是用来传授道理、教授学业、解答疑惑的人。',
      analysis: '"师者"是判断句主语，"所以"表示"用来...的"，"受"通"授"，表示传授。整句是判断句，"也"是判断句标志。',
      tags: '文言文,判断句,翻译',
      errorType: '实词理解错误',
      errorPoint: '"受"没有理解为通假字"授"'
    },
    {
      subjectName: '高中生物',
      chapter: '细胞代谢',
      difficulty: '中等',
      question: '光合作用的光反应阶段发生的场所和产物分别是什么？',
      answer: '场所：类囊体薄膜；产物：ATP、NADPH、O₂',
      analysis: '光反应在类囊体薄膜上进行，通过光解水产生氧气，同时将光能转化为化学能储存在ATP和NADPH中。',
      tags: '光合作用,光反应',
      errorType: '知识点混淆',
      errorPoint: '把光反应场所记成了叶绿体基质'
    },
    {
      subjectName: '历史',
      chapter: '中国近代史',
      difficulty: '简单',
      question: '标志着中国新民主主义革命开端的历史事件是什么？',
      answer: '五四运动（1919年）',
      analysis: '1919年的五四运动标志着中国工人阶级开始以独立的政治力量登上历史舞台，是中国新民主主义革命的开端。',
      tags: '近代史,五四运动',
      errorType: '时间记忆错误',
      errorPoint: '把五四运动时间记成了1921年'
    },
    {
      subjectName: '地理',
      chapter: '气候类型',
      difficulty: '中等',
      question: '地中海气候的特点是什么？分布在哪些地区？',
      answer: '特点：夏季炎热干燥，冬季温和多雨；分布：南北纬30°-40°大陆西岸',
      analysis: '地中海气候受副热带高气压带和西风带交替控制，夏季受副高控制炎热干燥，冬季受西风带控制温和多雨。',
      tags: '气候,地中海气候',
      errorType: '分布规律记错',
      errorPoint: '把分布范围记成了南北纬20°-30°'
    }
  ];
  
  let successCount = 0;
  for (const m of mistakes) {
    const subjectId = subjectMap[m.subjectName];
    if (!subjectId) {
      console.log(`   ❌ 学科不存在: ${m.subjectName}`);
      continue;
    }
    
    const result = await post('/api/mistakes', {
      subjectId: subjectId,
      chapter: m.chapter,
      difficulty: m.difficulty,
      question: m.question,
      answer: m.answer,
      analysis: m.analysis,
      tags: m.tags,
      errorType: m.errorType,
      errorPoint: m.errorPoint
    }, token);
    
    if (result.status === 200) {
      successCount++;
      console.log(`   ✅ ${m.subjectName} - ${m.chapter}`);
    } else {
      console.log(`   ❌ 添加失败: ${m.subjectName} - ${result.status}`);
    }
  }
  
  // 统计数据
  console.log('\n=== 数据添加完成 ===');
  const finalMistakes = await get('/api/mistakes', token);
  console.log(`\n📊 当前数据统计:`);
  console.log(`   - 错题总数: ${finalMistakes.json.length} 道`);
  console.log(`   - 本次添加: ${successCount} 道`);
  console.log(`   - 学科总数: ${Object.keys(subjectMap).length} 个`);
  
  console.log('\n🎉 模拟数据添加完成！请在浏览器中访问前端页面查看效果。');
}

main();
