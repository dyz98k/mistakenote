(function () {
  'use strict';

  const API_BASE = '';
  const STORAGE_KEY = 'cuoben_auth';

  let state = {
  subjects: [],
  chaptersBySubject: {},
  keywords: {},
  items: [],
  listItems: [],
  listTotal: 0,
  listHasMore: false,
  listLoading: false,
  user: null,
  token: null
};

  let currentView = 'login';
  let currentImage = null;
  let currentDifficulty = '中等';
  let editingId = null;
  let manageMode = 'subject';
  let manageSubject = null;

  function loadAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        state.token = data.token;
        state.user = data.user;
      }
    } catch (e) {}
  }

  function saveAuth(user, token) {
    state.user = user;
    state.token = token;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  }

  function clearAuth() {
    state.user = null;
    state.token = null;
    localStorage.removeItem(STORAGE_KEY);
    state.items = [];
    state.listItems = [];
    state.listTotal = 0;
    state.listHasMore = false;
    state.listLoading = false;
    state.subjects = [];
    state.chaptersBySubject = {};
    state.keywords = {};
  }

  async function apiRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth();
          switchView('login');
          showToast('登录已过期，请重新登录');
          throw new Error('登录已过期，请重新登录');
        }
      }

      const text = await response.text();
      let data;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }
      } else {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 404) {
          showToast('请求的资源不存在');
        } else if (response.status >= 500) {
          showToast('服务器错误，请稍后重试');
        }
        throw new Error((data && (data.error || data.message)) || '请求失败');
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查服务器是否启动');
      }
      throw error;
    }
  }

  function $(id) { return document.getElementById(id); }
  function $$(sel, parent) { return Array.from((parent || document).querySelectorAll(sel)); }

  function formatDate(ts) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function isSameDay(ts) {
    const now = new Date();
    const d = new Date(ts);
    return now.getFullYear() === d.getFullYear()
      && now.getMonth() === d.getMonth()
      && now.getDate() === d.getDate();
  }

  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function showDialog(title, text, onOk) {
    $('confirmDialog').classList.remove('hidden');
    $('inputDialog').classList.add('hidden');
    $('dialogTitle').textContent = title;
    $('dialogText').textContent = text;
    $('overlay').classList.remove('hidden');
    const okBtn = $('dialogOk');
    const cancelBtn = $('dialogCancel');
    const close = () => {
      $('overlay').classList.add('hidden');
      $('confirmDialog').classList.add('hidden');
    };
    const okHandler = () => {
      cleanup();
      close();
      onOk && onOk();
    };
    const cancelHandler = () => { cleanup(); close(); };
    function cleanup() {
      okBtn.removeEventListener('click', okHandler);
      cancelBtn.removeEventListener('click', cancelHandler);
    }
    okBtn.addEventListener('click', okHandler);
    cancelBtn.addEventListener('click', cancelHandler);
  }

  function showInputDialog(title, placeholder, defaultValue, onOk) {
    $('confirmDialog').classList.add('hidden');
    $('inputDialog').classList.remove('hidden');
    $('inputDialogTitle').textContent = title;
    $('inputDialogValue').placeholder = placeholder;
    $('inputDialogValue').value = defaultValue || '';
    $('overlay').classList.remove('hidden');
    const okBtn = $('inputDialogOk');
    const cancelBtn = $('inputDialogCancel');
    const input = $('inputDialogValue');
    const close = () => {
      $('overlay').classList.add('hidden');
      $('inputDialog').classList.add('hidden');
    };
    setTimeout(() => input.focus(), 100);
    const okHandler = () => {
      cleanup();
      close();
      onOk && onOk(input.value.trim());
    };
    const cancelHandler = () => { cleanup(); close(); };
    const keyHandler = (e) => {
      if (e.key === 'Enter') { okHandler(); }
      if (e.key === 'Escape') { cancelHandler(); }
    };
    function cleanup() {
      okBtn.removeEventListener('click', okHandler);
      cancelBtn.removeEventListener('click', cancelHandler);
      input.removeEventListener('keydown', keyHandler);
    }
    okBtn.addEventListener('click', okHandler);
    cancelBtn.addEventListener('click', cancelHandler);
    input.addEventListener('keydown', keyHandler);
  }

  function switchView(name, opts) {
    currentView = name;
    $$('.view').forEach(v => v.classList.add('hidden'));

    const viewMap = {
      'login': 'view-login',
      'register': 'view-register',
      'home': 'view-home',
      'upload': 'view-upload',
      'list': 'view-list',
      'detail': 'view-detail',
      'manage': 'view-manage',
      'rewards': 'view-rewards',
      'ai': 'view-ai',
      'practice': 'view-practice',
      'profile': 'view-profile'
    };
    const el = $(viewMap[name]);
    if (el) el.classList.remove('hidden');

    const titleMap = {
      'login': '登录',
      'register': '注册',
      'home': '错题本',
      'upload': (opts && opts.editing) ? '编辑错题' : '上传错题',
      'list': '分类浏览',
      'detail': '错题详情',
      'manage': (manageMode === 'subject') ? '管理学科' : '管理章节',
      'rewards': '奖励中心',
      'ai': 'AI小助手',
      'practice': '专项练习',
      'profile': '我的'
    };
    $('pageTitle').textContent = titleMap[name] || '错题本';
    $('backBtn').hidden = ['login', 'register', 'home'].includes(name);

    $$('.tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.view === name);
    });

    if (['login', 'register'].includes(name)) {
      $$('.tabbar').forEach(t => t.classList.add('hidden'));
      $('topbar').classList.add('hidden');
    } else {
      $$('.tabbar').forEach(t => t.classList.remove('hidden'));
      $('topbar').classList.remove('hidden');
      $('menuBtn').classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  async function handleLogin() {
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value;

    if (!username || !password) {
      showToast('请输入用户名和密码');
      return;
    }

    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      // 初始化user对象
      state.user = {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        points: result.user.points,
        streak: result.user.streak,
        level: calculateLevel(result.user.points),
        levelTitle: getLevelTitle(calculateLevel(result.user.points))
      };
      saveAuth(state.user, result.token);
      await loadData();
      if (!state.token) {
        showToast('登录已过期，请重新登录');
        return;
      }
      switchView('home');
      renderHome();
      showToast('登录成功');
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleRegister() {
    const username = $('regUsername').value.trim();
    const password = $('regPassword').value;
    const email = $('regEmail').value.trim();

    if (!username || !password) {
      showToast('请输入用户名和密码');
      return;
    }

    if (password.length < 6) {
      showToast('密码至少6位');
      return;
    }

    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, email })
      });
      showToast('注册成功，请登录');
      switchView('login');
    } catch (err) {
      showToast(err.message);
    }
  }

  async function loadData() {
    try {
      const [subjectsRes, mistakesRes, profileRes] = await Promise.all([
        apiRequest('/api/subjects'),
        apiRequest('/api/mistakes'),
        apiRequest('/api/rewards/profile')
      ]);

      state.subjects = Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes?.value || []);
      state.items = Array.isArray(mistakesRes) ? mistakesRes : (mistakesRes?.content || mistakesRes?.value || []);
      if (profileRes) {
        state.user.points = profileRes.points || 0;
        state.user.level = profileRes.level || 1;
        state.user.levelTitle = profileRes.levelTitle || '';
        state.user.streak = profileRes.streak || 0;
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      state.subjects = [];
      state.items = [];
    }
  }

  function autoClassify(text) {
    if (!text) return null;
    const t = text.toLowerCase();
    let best = null;
    let bestScore = 0;
    
    const subjectKeywords = {
      '高等数学': ['极限', '导数', '积分', '微分', '泰勒', '级数', '微分方程', '多元函数', '偏导数', '重积分'],
      '线性代数': ['矩阵', '行列式', '向量', '特征值', '特征向量', '线性无关', '秩', '正交', '对角化'],
      '概率论': ['概率', '期望', '方差', '分布', '正态', '随机变量', '条件概率', '贝叶斯'],
      '大学物理': ['力学', '热学', '光学', '电磁', '牛顿', '能量', '动量', '波动', '量子'],
      '英语': ['语法', '词汇', '阅读理解', '完形填空', '翻译', '写作', '听力', '单词'],
      '计算机': ['算法', '数据结构', '编程', '代码', '函数', '变量', '类', '对象', '网络', '数据库'],
      '离散数学': ['集合', '关系', '函数', '图', '树', '逻辑', '命题', '谓词', '证明', '归纳', '递归', '组合', '排列', '二项式', '容斥', '鸽巢', '同余', '群', '环', '域', '代数系统', '格', '布尔代数', '图论', '欧拉', '哈密顿', '最短路径', '最小生成树', '匹配', '染色', '平面图', '连通', '度数', '邻接', '矩阵', '可达', '强连通', '弱连通', '二部图', '完全图', '正则图', '欧拉图', '哈密顿图', '树', '森林', '生成树', '根树', '二叉树', '遍历', '前序', '中序', '后序', '层次', '哈夫曼', '最优树', '最小生成树', 'Kruskal', 'Prim', 'Dijkstra', 'Floyd', 'Warshall', '拓扑排序', '关键路径', '网络流', '最大流', '最小割', '匹配', '最大匹配', '完美匹配', '二分匹配', '匈牙利算法', '染色', '四色定理', '平面图', '欧拉公式', '对偶图', '同构', '自同构', '自补图', '补图', '图的运算', '并', '交', '差', '对称差', '笛卡尔积', '逻辑', '命题', '谓词', '量词', '联结词', '真值表', '等价', '蕴含', '逆否', '对偶', '范式', '析取范式', '合取范式', '主范式', '推理规则', '证明', '归纳', '数学归纳法', '强归纳', '反证法', '构造法', '穷举法', '组合', '排列', '组合数', '排列数', '二项式定理', '多项式系数', '容斥原理', '鸽巢原理', '抽屉原理', 'Ramsey', '递推', '递推关系', '特征方程', '生成函数', '指数生成函数', '同余', '模', '同余方程', '中国剩余定理', '欧拉定理', '费马小定理', '数论', '素数', '合数', '整除', '最大公约数', '最小公倍数', '互质', '欧几里得算法', '扩展欧几里得', '模逆元', '群', '子群', '陪集', '商群', '同态', '同构', '循环群', '置换群', '对称群', '交错群', '环', '子环', '理想', '商环', '整环', '域', '子域', '扩域', '有限域', '伽罗瓦域', '多项式环', '格', '子格', '分配格', '模格', '布尔格', '布尔代数', '代数系统', '半群', '幺半群', '独异点', '群胚', '拟群', '圈', '商代数', '同余关系', '商结构']
    };
    
    for (const subj of state.subjects) {
      const kws = subjectKeywords[subj.name] || [];
      let score = 0;
      for (const kw of kws) {
        if (text.includes(kw)) score += 2;
        if (t.includes(kw.toLowerCase())) score += 1;
      }
      if (t.includes(subj.name.toLowerCase())) score += 5;
      if (score > bestScore) { bestScore = score; best = subj; }
    }
    return bestScore >= 2 ? best : null;
  }

  function renderProfile() {
    if (!state.user) return;
    const u = state.user;
    const items = Array.isArray(state.items) ? state.items : [];
    const subjects = Array.isArray(state.subjects) ? state.subjects : [];
    const todayCount = items.filter(i => isSameDay(i.createdAt)).length;

    $('profileAvatar').textContent = (u.username || 'U').charAt(0).toUpperCase();
    $('profileName').textContent = u.username || '用户';
    $('profileEmail').textContent = u.email || '未设置邮箱';
    $('profileEmailDisplay').textContent = u.email || '-';
    $('profileUsername').textContent = u.username || '-';
    $('profilePhoneDisplay').textContent = u.phone || '未绑定';
    $('profilePoints').textContent = u.points || 0;
    $('profileStreak').textContent = u.streak || 0;
    $('profileTotal').textContent = items.length;
    $('profileSubjects').textContent = subjects.length;
    $('profileToday').textContent = todayCount;
    const level = u.level || calculateLevel(u.points || 0);
    $('profileLevel').textContent = 'Lv.' + level + ' · ' + getLevelTitle(level);
  }

  async function renderHome() {
    if (!state.user) return;

    $('userName').textContent = state.user.username;
    $('userPoints').textContent = state.user.points || 0;
    $('userStreak').textContent = state.user.streak || 0;

    const items = Array.isArray(state.items) ? state.items : [];
    const subjects = Array.isArray(state.subjects) ? state.subjects : [];

    $('statTotal').textContent = items.length;
    $('statSubjects').textContent = subjects.length;
    const todayCount = items.filter(i => isSameDay(i.createdAt)).length;
    $('statToday').textContent = todayCount;

    const recentEl = $('recentList');
    const recent = items.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    if (recent.length === 0) {
      recentEl.innerHTML = '<div class="empty">还没有错题，点击底部 + 号添加第一张吧！</div>';
    } else {
      recentEl.innerHTML = recent.map(renderMistakeCard).join('');
      bindCardClicks(recentEl);
    }

    const subjEl = $('subjectChips');
    if (subjects.length === 0) {
      subjEl.innerHTML = '<div class="empty" style="padding:16px">暂无学科</div>';
    } else {
      subjEl.innerHTML = subjects.map(s => {
        const count = items.filter(i => i.subjectId === s.id).length;
        return `<span class="chip" data-subject="${s.id}" data-subject-name="${escapeHtml(s.name)}">${escapeHtml(s.name)} · ${count}</span>`;
      }).join('');
      $$('.chip', subjEl).forEach(c => {
        c.addEventListener('click', () => {
          $('listSubjectSelect').value = c.dataset.subject;
          $('listChapterSelect').value = '';
          enterList();
        });
      });
    }
  }

  function renderMistakeCard(item) {
    const diffClass = item.difficulty === '困难' ? 'hard' : '';
    const subjects = Array.isArray(state.subjects) ? state.subjects : [];
    const subjectName = subjects.find(s => s.id === item.subjectId)?.name || item.subject || '未知科目';
    const imgHtml = item.imageUrl
      ? `<img class="thumb" src="${item.imageUrl}" alt="错题图" />`
      : `<div class="thumb"></div>`;
    const note = item.question ? escapeHtml(item.question.slice(0, 30)) : '（无内容）';
    return `
      <div class="mistake-card" data-id="${item.id}">
        ${imgHtml}
        <div class="info">
          <h4 class="title">${escapeHtml(subjectName)} · ${escapeHtml(item.chapter || '未分类')}</h4>
          <div class="date">${formatDate(item.createdAt)}</div>
          <div class="tags">
            <span class="tag chapter">${escapeHtml(item.chapter || '未分类')}</span>
            <span class="tag difficulty ${diffClass}">${escapeHtml(item.difficulty || '中等')}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${note}</div>
        </div>
      </div>
    `;
  }

  function bindCardClicks(container, sourceItems) {
    $$('.mistake-card', container).forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id, 10);
        const items = Array.isArray(sourceItems) ? sourceItems : (Array.isArray(state.items) ? state.items : []);
        const item = items.find(i => i.id === id);
        if (item) openDetail(item);
      });
    });
  }

  function resetUploadForm() {
    currentImage = null;
    editingId = null;
    $('fileInput').value = '';
    $('uploadArea').classList.remove('hidden');
    $('preview').classList.add('hidden');
    $('preview').style.display = 'none';
    $('autoTag').classList.add('hidden');
    hideMultiQuestionPanel();
  }

  function enterUpload(opts) {
    switchView('upload', opts);
    if (opts && opts.editing && opts.item) {
      // 编辑模式：把已有错题装入多题面板，作为唯一一道题
      const it = opts.item;
      editingId = it.id;
      currentImage = it.imageUrl || null;
      if (it.imageUrl) {
        $('previewImg').src = it.imageUrl;
        $('uploadArea').classList.add('hidden');
        $('preview').classList.remove('hidden');
        $('preview').style.display = 'block';
      } else {
        $('uploadArea').classList.remove('hidden');
        $('preview').classList.add('hidden');
        $('preview').style.display = 'none';
      }
      const subjects = Array.isArray(state.subjects) ? state.subjects : [];
      const subj = subjects.find(s => s.id === it.subjectId);
      multiQuestions = [{
        text: it.question || '',
        answer: it.answer || '',
        added: false,
        subjectName: subj ? subj.name : '',
        chapter: it.chapter || '',
        difficulty: it.difficulty || '中等',
        classifying: false,
        classifyErr: null,
        generatingAnswer: false,
        editingId: it.id
      }];
      $('multiCount').textContent = '1';
      renderMultiQuestionList();
      const panel = $('multiQuestionPanel');
      panel.classList.remove('hidden');
      panel.style.display = 'block';
      $('autoTag').classList.add('hidden');
    } else {
      resetUploadForm();
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function resizeDataUrl(dataUrl, maxSize) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h && w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
        else if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // ===== 图片裁剪 =====
  let cropCallback = null;
  let cropNatural = { w: 0, h: 0 };
  let cropDisp = { w: 0, h: 0 };
  let cropBox = { x: 0, y: 0, w: 0, h: 0 };
  let cropDrag = null;

  function openCropDialog(dataUrl, onDone) {
    cropCallback = onDone;
    const img = $('cropImg');
    const stage = $('cropStage');
    img.onload = () => {
      requestAnimationFrame(() => {
        const sw = stage.clientWidth;
        const sh = img.clientHeight;
        cropNatural = { w: img.naturalWidth, h: img.naturalHeight };
        cropDisp = { w: sw, h: sh };
        stage.style.height = sh + 'px';
        const bw = Math.round(sw * 0.8);
        const bh = Math.round(sh * 0.8);
        setCropBox(Math.round((sw - bw) / 2), Math.round((sh - bh) / 2), bw, bh);
      });
    };
    img.src = dataUrl;
    $('confirmDialog').classList.add('hidden');
    $('inputDialog').classList.add('hidden');
    const dlg = $('cropDialog');
    dlg.classList.remove('hidden');
    dlg.style.display = 'block';
    $('overlay').classList.remove('hidden');
  }

  function setCropBox(x, y, w, h) {
    cropBox = { x, y, w, h };
    const box = $('cropBox');
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
  }

  function closeCropDialog() {
    const dlg = $('cropDialog');
    dlg.classList.add('hidden');
    dlg.style.display = 'none';
    $('overlay').classList.add('hidden');
    cropCallback = null;
    cropDrag = null;
  }

  function confirmCrop() {
    if (!cropCallback) { closeCropDialog(); return; }
    if (!cropDisp.w || !cropDisp.h) { closeCropDialog(); return; }
    const scale = cropNatural.w / cropDisp.w;
    const sx = Math.max(0, Math.round(cropBox.x * scale));
    const sy = Math.max(0, Math.round(cropBox.y * scale));
    const sw = Math.max(1, Math.round(cropBox.w * scale));
    const sh = Math.max(1, Math.round(cropBox.h * scale));
    const img = $('cropImg');
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const out = canvas.toDataURL('image/jpeg', 0.9);
    const cb = cropCallback;
    closeCropDialog();
    cb(out);
  }

  function skipCrop() {
    if (!cropCallback) { closeCropDialog(); return; }
    const out = $('cropImg').src;
    const cb = cropCallback;
    closeCropDialog();
    cb(out);
  }

  function initCropEvents() {
    const box = $('cropBox');
    const stage = $('cropStage');

    box.addEventListener('pointerdown', (e) => {
      if (!cropDisp.w) return;
      const isHandle = e.target.classList.contains('crop-handle');
      cropDrag = {
        mode: isHandle ? 'resize' : 'move',
        handle: isHandle ? e.target.dataset.h : null,
        startX: e.clientX,
        startY: e.clientY,
        box: { ...cropBox }
      };
      try { box.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    box.addEventListener('pointermove', (e) => {
      if (!cropDrag) return;
      const rect = stage.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const minSize = 40;
      const b = cropDrag.box;
      let x = b.x, y = b.y, w = b.w, h = b.h;
      if (cropDrag.mode === 'move') {
        x = Math.max(0, Math.min(cropDisp.w - b.w, b.x + (e.clientX - cropDrag.startX)));
        y = Math.max(0, Math.min(cropDisp.h - b.h, b.y + (e.clientY - cropDrag.startY)));
      } else {
        const handle = cropDrag.handle;
        if (handle === 'br') {
          // 左上角 (x, y) 固定
          w = Math.max(minSize, Math.min(cropDisp.w - b.x, mx - b.x));
          h = Math.max(minSize, Math.min(cropDisp.h - b.y, my - b.y));
        } else if (handle === 'tr') {
          // 左下角 (x, y+h) 固定
          const fixY = b.y + b.h;
          y = Math.max(0, Math.min(fixY - minSize, my));
          h = Math.max(minSize, fixY - y);
          w = Math.max(minSize, Math.min(cropDisp.w - b.x, mx - b.x));
        } else if (handle === 'bl') {
          // 右上角 (x+w, y) 固定
          const fixX = b.x + b.w;
          x = Math.max(0, Math.min(fixX - minSize, mx));
          w = Math.max(minSize, fixX - x);
          h = Math.max(minSize, Math.min(cropDisp.h - b.y, my - b.y));
        } else if (handle === 'tl') {
          // 右下角 (x+w, y+h) 固定
          const fixX = b.x + b.w;
          const fixY = b.y + b.h;
          x = Math.max(0, Math.min(fixX - minSize, mx));
          y = Math.max(0, Math.min(fixY - minSize, my));
          w = Math.max(minSize, fixX - x);
          h = Math.max(minSize, fixY - y);
        }
      }
      setCropBox(x, y, w, h);
    });

    const endDrag = (e) => {
      if (cropDrag) {
        try { box.releasePointerCapture(e.pointerId); } catch (_) {}
        cropDrag = null;
      }
    };
    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);

    $('cropConfirmBtn').addEventListener('click', confirmCrop);
    $('cropSkipBtn').addEventListener('click', skipCrop);
    $('cropCancelBtn').addEventListener('click', closeCropDialog);
  }

  async function applyOcrAndPreview(dataUrl) {
    currentImage = dataUrl;
    $('previewImg').src = dataUrl;
    $('uploadArea').classList.add('hidden');
    $('preview').classList.remove('hidden');
    $('preview').style.display = 'block';
    showToast('图片已添加');
    hideMultiQuestionPanel();

    const ocrStatus = $('ocrStatus');
    ocrStatus.classList.remove('hidden');
    ocrStatus.textContent = '正在自动识别图片文字...';
    try {
      const result = await apiRequest('/api/mistakes/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      const text = (result.text || '').trim();
      const questions = Array.isArray(result.questions) ? result.questions : (text ? [text] : []);
      if (questions.length > 0) {
        ocrStatus.textContent = `已识别 ${questions.length} 题，AI正在生成答案和分类...`;
        setTimeout(() => ocrStatus.classList.add('hidden'), 3000);
        // 所有题目都在多题面板中展示，每题都有4个可编辑框
        showMultiQuestionPanel(questions);
      } else {
        ocrStatus.textContent = '未识别到文字';
        setTimeout(() => ocrStatus.classList.add('hidden'), 3000);
      }
    } catch (err) {
      ocrStatus.textContent = '识别失败：' + err.message;
      setTimeout(() => ocrStatus.classList.add('hidden'), 3000);
    }
  }

  async function handleFile(file) {
    if (!file) return;
    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      openCropDialog(rawDataUrl, async (cropped) => {
        try {
          const dataUrl = await resizeDataUrl(cropped, 1000);
          await applyOcrAndPreview(dataUrl);
        } catch (e) {
          console.error('图片处理失败:', e);
          showToast('图片处理失败');
        }
      });
    } catch (e) {
      console.error('读取图片失败:', e);
      showToast('读取图片失败');
    }
  }

  // ===== 多题识别面板 =====
  let multiQuestions = []; // [{ text, answer, added, subjectName, chapter, classifying, classifyErr }]

  function hideMultiQuestionPanel() {
    $('multiQuestionPanel').classList.add('hidden');
    $('multiQuestionPanel').style.display = 'none';
    multiQuestions = [];
  }

  function showMultiQuestionPanel(questions) {
    multiQuestions = questions.map(q => ({
      text: q, answer: '', added: false,
      subjectName: '', chapter: '',
      difficulty: '中等',
      classifying: true, classifyErr: null,
      generatingAnswer: true
    }));
    $('multiCount').textContent = multiQuestions.length;
    renderMultiQuestionList();
    const panel = $('multiQuestionPanel');
    panel.classList.remove('hidden');
    panel.style.display = 'block';
    // 异步为每题自动分类 + 自动生成答案
    multiQuestions.forEach((_, idx) => {
      classifyMultiQuestion(idx);
      generateMultiAnswer(idx);
    });
  }

  // 自动生成答案（用于多题面板）
  async function generateMultiAnswer(idx) {
    const item = multiQuestions[idx];
    if (!item || item.added) return;
    const question = item.text.trim();
    if (!question) {
      multiQuestions[idx].generatingAnswer = false;
      return;
    }
    try {
      const result = await apiRequest('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const answer = typeof result === 'string' ? result : (result && (result.answer || result.content) || '');
      if (multiQuestions[idx] && answer && !multiQuestions[idx].answer) {
        multiQuestions[idx].answer = answer;
        multiQuestions[idx].generatingAnswer = false;
        // 只更新对应题目的答案框，不重新渲染整个列表（避免用户输入被重置）
        const ta = $('multiQuestionList').querySelector(`.multi-answer[data-idx="${idx}"]`);
        if (ta && !ta.value.trim()) ta.value = answer;
      }
    } catch (err) {
      if (multiQuestions[idx]) multiQuestions[idx].generatingAnswer = false;
    }
  }

  // 调用 AI 分类接口并刷新对应题目的学科/知识点/难度
  async function classifyMultiQuestion(idx) {
    const item = multiQuestions[idx];
    if (!item || item.added) return;
    const question = item.text.trim();
    if (!question) {
      item.classifying = false;
      return;
    }
    try {
      const result = await apiRequest('/api/mistakes/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      if (multiQuestions[idx]) {
        // 仅在用户未手动填写时填充
        if (!multiQuestions[idx].subjectName) {
          multiQuestions[idx].subjectName = result.subjectName || '';
          const inp = $('multiQuestionList').querySelector(`.multi-input[data-idx="${idx}"][data-field="subjectName"]`);
          if (inp && !inp.value.trim()) inp.value = multiQuestions[idx].subjectName;
        }
        if (!multiQuestions[idx].chapter) {
          multiQuestions[idx].chapter = result.chapter || '';
          const inp = $('multiQuestionList').querySelector(`.multi-input[data-idx="${idx}"][data-field="chapter"]`);
          if (inp && !inp.value.trim()) inp.value = multiQuestions[idx].chapter;
        }
        // 难度由 AI 自动生成，不可修改
        if (result.difficulty) {
          multiQuestions[idx].difficulty = result.difficulty;
        }
        multiQuestions[idx].classifying = false;
        multiQuestions[idx].classifyErr = null;
        // 更新状态标签
        const head = $('multiQuestionList').querySelector(`.multi-item[data-idx="${idx}"] .multi-item-head`);
        if (head) {
          const existing = head.querySelector('.multi-tag');
          if (existing) existing.outerHTML = '<span class="multi-tag ok">✓ AI 已填充，可修改</span>';
        }
        // 更新难度星星显示
        const diffEl = $('multiQuestionList').querySelector(`.multi-item[data-idx="${idx}"] .multi-diff`);
        if (diffEl) diffEl.innerHTML = difficultyStars(multiQuestions[idx].difficulty);
      }
    } catch (err) {
      if (multiQuestions[idx]) {
        multiQuestions[idx].classifying = false;
        multiQuestions[idx].classifyErr = err.message || '分类失败';
      }
    }
  }

  // 难度转星星：简单=1星，中等=2星，困难=3星
  function difficultyStars(diff) {
    const n = diff === '简单' ? 1 : (diff === '困难' ? 3 : 2);
    return '★'.repeat(n) + '☆'.repeat(3 - n) + ' ' + diff;
  }

  // 根据 subjectName 找已有学科，找不到则创建
  async function ensureSubject(subjectName) {
    const subjects = Array.isArray(state.subjects) ? state.subjects : [];
    const found = subjects.find(s => s.name === subjectName);
    if (found) return found;
    try {
      const created = await apiRequest('/api/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: subjectName })
      });
      if (created && created.id) {
        state.subjects.push(created);
        return created;
      }
    } catch (err) {
      console.error('创建学科失败:', err.message);
    }
    return null;
  }

  // 确保 chapterName 在指定学科下存在（不存在则创建）
  async function ensureChapter(subjectId, chapterName) {
    const chapters = state.chaptersBySubject[subjectId] || [];
    if (chapters.includes(chapterName)) return true;
    try {
      await apiRequest(`/api/subjects/${subjectId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter: chapterName })
      });
      if (!state.chaptersBySubject[subjectId]) state.chaptersBySubject[subjectId] = [];
      if (!state.chaptersBySubject[subjectId].includes(chapterName)) {
        state.chaptersBySubject[subjectId].push(chapterName);
      }
      return true;
    } catch (err) {
      console.error('创建章节失败:', err.message);
      return false;
    }
  }

  function renderMultiQuestionList() {
    const listEl = $('multiQuestionList');
    listEl.innerHTML = multiQuestions.map((q, idx) => {
      const statusTag = q.added
        ? '<span class="added-mark">已添加 ✓</span>'
        : (q.classifying ? '<span class="multi-tag classifying">AI 识别中...</span>' : '<span class="multi-tag ok">✓ AI 已填充，可修改</span>');
      return `
      <div class="multi-item ${q.added ? 'added' : ''}" data-idx="${idx}">
        <div class="multi-item-head">
          <span class="multi-item-no">第 ${idx + 1} 题</span>
          ${statusTag}
        </div>
        <label class="multi-field-label">📝 题目</label>
        <textarea class="multi-text" data-idx="${idx}" data-field="text">${escapeHtml(q.text)}</textarea>
        <label class="multi-field-label">💡 答案</label>
        <textarea class="multi-text multi-answer" data-idx="${idx}" data-field="answer" placeholder="AI自动生成，可修改">${escapeHtml(q.answer || '')}</textarea>
        <div class="answer-actions">
          <button class="small-btn multi-ai-btn" data-idx="${idx}" type="button">🤖 AI 生成答案</button>
          <button class="small-btn multi-photo-btn" data-idx="${idx}" type="button">📷 拍照识别答案</button>
          <input type="file" class="multi-answer-file" data-idx="${idx}" accept="image/*" capture="environment" hidden>
        </div>
        <label class="multi-field-label">📚 学科</label>
        <input type="text" class="multi-input" data-idx="${idx}" data-field="subjectName" placeholder="AI自动识别，可修改" value="${escapeHtml(q.subjectName || '')}">
        <label class="multi-field-label">📖 知识点</label>
        <input type="text" class="multi-input" data-idx="${idx}" data-field="chapter" placeholder="AI自动识别，可修改" value="${escapeHtml(q.chapter || '')}">
        <div class="multi-diff">⏳ 难度识别中...</div>
        <div class="multi-item-actions">
          ${q.added ? '' : `<button class="small-btn multi-add-btn" data-idx="${idx}">添加此题</button>`}
        </div>
      </div>`;
    }).join('');
    // 初始化每题的难度显示
    multiQuestions.forEach((q, idx) => {
      const diffEl = listEl.querySelector(`.multi-item[data-idx="${idx}"] .multi-diff`);
      if (diffEl) {
        if (q.difficulty) {
          diffEl.innerHTML = difficultyStars(q.difficulty);
        } else if (!q.classifying) {
          diffEl.innerHTML = difficultyStars('中等');
        }
      }
    });
    // 绑定按钮
    $$('.multi-add-btn', listEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        addSingleQuestion(idx);
      });
    });
    // AI 生成答案按钮
    $$('.multi-ai-btn', listEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        handleMultiAiAnswer(idx, btn);
      });
    });
    // 拍照识别答案按钮
    $$('.multi-photo-btn', listEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const fileInput = listEl.querySelector(`.multi-answer-file[data-idx="${idx}"]`);
        if (fileInput) fileInput.click();
      });
    });
    // 拍照文件选择
    $$('.multi-answer-file', listEl).forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const f = e.target.files && e.target.files[0];
        if (f) handleMultiAnswerImage(idx, f);
        e.target.value = '';
      });
    });
    // 同步 textarea 编辑（题目 + 答案）
    $$('.multi-text', listEl).forEach(ta => {
      ta.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const field = e.target.dataset.field || 'text';
        if (multiQuestions[idx]) multiQuestions[idx][field] = e.target.value;
      });
    });
    // 同步 input 编辑（学科 + 知识点）
    $$('.multi-input', listEl).forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const field = e.target.dataset.field;
        if (multiQuestions[idx]) {
          multiQuestions[idx][field] = e.target.value;
          // 用户手动改过学科/知识点后，标记为已分类
          if (field === 'subjectName' || field === 'chapter') {
            multiQuestions[idx].classifying = false;
            multiQuestions[idx].classifyErr = null;
          }
        }
      });
    });
  }

  async function addSingleQuestion(idx) {
    if (!multiQuestions[idx]) return;
    const item = multiQuestions[idx];
    const question = item.text.trim();
    if (!question) { showToast('题目内容为空'); return; }
    const answer = (item.answer || '').trim();

    // 学科/章节优先用题目内的 AI 识别结果
    let subjectId;
    let chapter;
    if (item.subjectName) {
      const subj = await ensureSubject(item.subjectName);
      if (subj && subj.id) {
        subjectId = subj.id;
        chapter = item.chapter || '未分类';
        await ensureChapter(subjectId, chapter);
      }
    }
    if (!subjectId) {
      showToast('请填写学科后再添加');
      return;
    }

    try {
      // 编辑模式：更新已有错题
      if (item.editingId) {
        const result = await apiRequest(`/api/mistakes/${item.editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            subjectId,
            chapter: chapter || '未分类',
            difficulty: item.difficulty || '中等',
            question,
            answer,
            imageUrl: currentImage
          })
        });
        const items = Array.isArray(state.items) ? state.items : [];
        const i = items.findIndex(x => x.id === item.editingId);
        if (i > -1) state.items[i] = result;
        multiQuestions[idx].added = true;
        renderMultiQuestionList();
        showToast('已保存修改');
        editingId = null;
        return;
      }
      // 新增错题
      const result = await apiRequest('/api/mistakes', {
        method: 'POST',
        body: JSON.stringify({
          subjectId,
          chapter: chapter || '未分类',
          difficulty: item.difficulty || '中等',
          question,
          answer,
          imageUrl: currentImage
        })
      });
      state.items.push(result);
      multiQuestions[idx].added = true;
      renderMultiQuestionList();
      const remaining = multiQuestions.filter(q => !q.added).length;
      showToast(`已添加第 ${idx + 1} 题${remaining > 0 ? '，还剩 ' + remaining + ' 题' : '，全部添加完成'}`);
    } catch (err) {
      showToast('添加失败: ' + err.message);
    }
  }

  async function addAllQuestions() {
    const pending = multiQuestions
      .map((q, idx) => ({ idx, text: q.text.trim(), answer: (q.answer || '').trim(), added: q.added, q: q }))
      .filter(p => !p.added && p.text);
    if (pending.length === 0) {
      showToast('没有可添加的题目');
      return;
    }
    let success = 0;
    for (const item of pending) {
      let subjectId;
      let chapter;
      if (item.q.subjectName) {
        const subj = await ensureSubject(item.q.subjectName);
        if (subj && subj.id) {
          subjectId = subj.id;
          chapter = item.q.chapter || '未分类';
          await ensureChapter(subjectId, chapter);
        }
      }
      if (!subjectId) {
        console.error('第' + (item.idx + 1) + '题无学科');
        continue;
      }
      try {
        const result = await apiRequest('/api/mistakes', {
          method: 'POST',
          body: JSON.stringify({
            subjectId,
            chapter: chapter || '未分类',
            difficulty: item.q.difficulty || '中等',
            question: item.text,
            answer: item.answer,
            imageUrl: currentImage
          })
        });
        state.items.push(result);
        multiQuestions[item.idx].added = true;
        success++;
      } catch (err) {
        console.error('第' + (item.idx + 1) + '题添加失败:', err.message);
      }
    }
    renderMultiQuestionList();
    showToast(`成功添加 ${success}/${pending.length} 题`);
  }

  // 多题面板：AI 生成答案
  async function handleMultiAiAnswer(idx, btn) {
    const item = multiQuestions[idx];
    if (!item) return;
    const question = item.text.trim();
    if (!question) {
      showToast('题目内容为空');
      return;
    }
    const originalText = btn.textContent;
    btn.textContent = '🤖 AI 分析中...';
    btn.disabled = true;
    try {
      const result = await apiRequest('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: '请解答以下题目，给出答案和简要解析：\n\n' + question })
      });
      if (result && result.answer) {
        multiQuestions[idx].answer = result.answer;
        const ta = document.querySelector(`.multi-answer[data-idx="${idx}"]`);
        if (ta) ta.value = result.answer;
        showToast(`第 ${idx + 1} 题答案已生成 ✓`);
      } else {
        showToast('AI 未返回答案');
      }
    } catch (err) {
      showToast('AI 生成失败: ' + err.message);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  // 多题面板：拍照识别答案
  async function handleMultiAnswerImage(idx, file) {
    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      openCropDialog(rawDataUrl, async (cropped) => {
        try {
          const dataUrl = await resizeDataUrl(cropped, 1000);
          showToast(`正在识别第 ${idx + 1} 题答案...`);
          const result = await apiRequest('/api/mistakes/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl })
          });
          const text = (result.text || '').trim();
          if (text) {
            const existing = (multiQuestions[idx].answer || '').trim();
            const newVal = existing ? existing + '\n' + text : text;
            multiQuestions[idx].answer = newVal;
            const ta = document.querySelector(`.multi-answer[data-idx="${idx}"]`);
            if (ta) ta.value = newVal;
            showToast(`第 ${idx + 1} 题答案已识别 ✓`);
          } else {
            showToast('未识别到文字');
          }
        } catch (err) {
          showToast('识别失败: ' + err.message);
        }
      });
    } catch (e) {
      console.error('答案图片处理失败:', e);
      showToast('图片处理失败');
    }
  }


  function refreshListFilters() {
    const subjSel = $('listSubjectSelect');
    const chSel = $('listChapterSelect');
    const subjects = Array.isArray(state.subjects) ? state.subjects : [];
    const curSubj = subjSel.value;
    subjSel.innerHTML = '<option value="">全部学科</option>' +
      subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    if (curSubj && subjects.some(s => String(s.id) === curSubj)) subjSel.value = curSubj;

    const subjId = subjSel.value;
    const chapters = subjId ? (state.chaptersBySubject[subjId] || []) : [];
    const curCh = chSel.value;
    chSel.innerHTML = '<option value="">全部章节</option>' +
      chapters.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (curCh && chapters.includes(curCh)) chSel.value = curCh;
  }

  async function loadListPage(reset) {
    const subjId = $('listSubjectSelect').value;
    const chapter = $('listChapterSelect').value;
    const keyword = ($('searchInput').value || '').trim();

    const page = reset ? 0 : state.listPage + 1;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', '20');
    if (subjId) params.set('subjectId', subjId);
    if (chapter) params.set('chapter', chapter);
    if (keyword) params.set('keyword', keyword);

    try {
      const res = await apiRequest('/api/mistakes?' + params.toString());
      const isArray = Array.isArray(res);
      const items = isArray ? res : (res?.content || []);
      const total = isArray ? items.length : (res?.totalElements != null ? res.totalElements : items.length);
      state.listItems = reset ? items : state.listItems.concat(items);
      state.listPage = page;
      state.listTotal = total;
      state.listHasMore = isArray ? false : (page + 1 < (res?.totalPages ?? 0));
    } catch (err) {
      showToast('加载错题失败: ' + err.message);
    }
  }

  async function enterList() {
    switchView('list');
    state.listItems = [];
    state.listTotal = 0;
    state.listHasMore = false;
    state.listLoading = true;
    renderList();
    await loadListPage(true);
    state.listLoading = false;
    renderList();
  }

  function renderList() {
    refreshListFilters();
    const container = $('listContainer');
    const subjId = $('listSubjectSelect').value;
    const chapter = $('listChapterSelect').value;

    const subjects = Array.isArray(state.subjects) ? state.subjects : [];
    const items = Array.isArray(state.listItems) ? state.listItems : [];

    if (state.listLoading) {
      container.innerHTML = '<div class="empty">加载中...</div>';
      return;
    }
    if (items.length === 0) {
      container.innerHTML = '<div class="empty">暂无错题，快去添加吧～</div>';
      return;
    }

    const subjName = subjId ? (subjects.find(s => String(s.id) === subjId)?.name || '') : '';
    const filterLabel = [subjName, chapter].filter(Boolean).join(' · ') || '全部';
    const moreBtn = state.listHasMore
      ? `<button id="loadMoreBtn" style="display:block;width:100%;margin-top:12px;padding:10px;background:var(--primary,#c9a96a);color:#fff;border:none;border-radius:8px;font-size:14px;">加载更多（已显示 ${items.length} / ${state.listTotal}）</button>`
      : '';

    container.innerHTML = `
      <div class="group-title" style="margin-bottom:10px;">
        <span class="name">${escapeHtml(filterLabel)}</span>
        <span class="count">${state.listTotal} 题</span>
      </div>
      <div class="mistake-list">${items.map(renderMistakeCard).join('')}</div>
      ${moreBtn}
    `;
    bindCardClicks(container, items);
    const loadMoreBtn = $('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', async () => {
        loadMoreBtn.disabled = true;
        await loadListPage(false);
        renderList();
      });
    }
  }

  function renderItemsGroup(items, emptyText) {
    if (items.length === 0) return `<div class="empty">${escapeHtml(emptyText)}</div>`;
    return `<div class="mistake-list">${items.map(renderMistakeCard).join('')}</div>`;
  }

  let detailItem = null;
  function openDetail(item) {
    detailItem = item;
    const imgEl = $('detailImg');
    if (item.imageUrl) {
      let imgUrl = item.imageUrl;
      if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) {
        imgUrl = '/' + imgUrl.replace(/^\//, '');
      }
      imgEl.src = imgUrl;
      imgEl.style.display = 'block';
      imgEl.alt = '错题图片';
    } else {
      imgEl.src = '';
      imgEl.style.display = 'none';
    }
    
    const subjects = Array.isArray(state.subjects) ? state.subjects : [];
    const subjectName = subjects.find(s => s.id === item.subjectId)?.name || item.subject || '-';
    $('detailSubject').textContent = subjectName;
    $('detailChapter').textContent = item.chapter || '-';
    $('detailDifficulty').textContent = item.difficulty || '-';
    $('detailDate').textContent = formatDate(item.createdAt);
    $('detailNote').textContent = item.question || '（没有题目内容）';

    if (item.errorType && item.errorPoint) {
      $('analysisErrorType').textContent = item.errorType;
      $('analysisErrorPoint').textContent = item.errorPoint;
      $('analysisContent').textContent = item.analysis || '无详细分析';
      $('detailAnalysis').style.display = 'block';
    } else {
      $('detailAnalysis').style.display = 'none';
    }
    
    switchView('detail');
  }

  function openManage(mode, subject) {
    manageMode = mode;
    const subjectId = subject ? subject.id : null;
    const subjectName = subject ? subject.name : '';
    manageSubject = subjectId;
    $('manageTitle').textContent = mode === 'subject' ? '管理学科' : `「${subjectName}」的章节`;
    $('newItemInput').placeholder = mode === 'subject' ? '输入新学科名称...' : '输入新章节名称...';
    switchView('manage');
    renderManageList();
  }

  function renderManageList() {
    const list = $('itemList');
    let arr = [];
    if (manageMode === 'subject') {
      const subjects = Array.isArray(state.subjects) ? state.subjects : [];
      arr = subjects.map(s => ({ id: s.id, name: s.name }));
    } else {
      arr = (state.chaptersBySubject[manageSubject] || []).map(name => ({ id: name, name }));
    }
    if (arr.length === 0) {
      list.innerHTML = '<div class="empty">暂无数据</div>';
      return;
    }
    list.innerHTML = arr.map((item, idx) => `
      <div class="item-row">
        <span class="item-name">${escapeHtml(item.name)}</span>
        <button class="del-x" data-idx="${idx}" data-id="${item.id}" data-name="${escapeHtml(item.name)}">✕</button>
      </div>
    `).join('');
    $$('.del-x', list).forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        showDialog('确认删除', `删除「${name}」？已归类的错题会改为未分类。`, async () => {
          try {
            if (manageMode === 'subject') {
              await apiRequest(`/api/subjects/${id}`, { method: 'DELETE' });
              const currentSubjects = Array.isArray(state.subjects) ? state.subjects : [];
              state.subjects = currentSubjects.filter(s => s.id != id);
              delete state.chaptersBySubject[id];
              delete state.keywords[id];
              const currentItems = Array.isArray(state.items) ? state.items : [];
              currentItems.forEach(it => { if (it.subjectId == id) it.subjectId = null; });
            } else {
              await apiRequest(`/api/subjects/${manageSubject}/chapters/${encodeURIComponent(name)}`, { method: 'DELETE' });
              state.chaptersBySubject[manageSubject] = (state.chaptersBySubject[manageSubject] || []).filter(c => c !== name);
              const currentItems = Array.isArray(state.items) ? state.items : [];
              currentItems.forEach(it => {
                if (it.subjectId == manageSubject && it.chapter === name) it.chapter = '未分类';
              });
            }
            renderManageList();
            showToast('已删除');
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    });
  }

  async function handleAddItem() {
    const val = ($('newItemInput').value || '').trim();
    if (!val) { showToast('请输入名称'); return; }
    try {
      if (manageMode === 'subject') {
        const subjects = Array.isArray(state.subjects) ? state.subjects : [];
        if (subjects.some(s => s.name === val)) { showToast('该学科已存在'); return; }
        const result = await apiRequest('/api/subjects', { method: 'POST', body: JSON.stringify({ name: val }) });
        state.subjects.push(result);
        state.chaptersBySubject[result.id] = [];
        state.keywords[result.id] = [];
      } else {
        const arr = state.chaptersBySubject[manageSubject] = state.chaptersBySubject[manageSubject] || [];
        if (arr.includes(val)) { showToast('该章节已存在'); return; }
        await apiRequest(`/api/subjects/${manageSubject}/chapters`, { method: 'POST', body: JSON.stringify({ chapter: val }) });
        arr.push(val);
      }
      $('newItemInput').value = '';
      renderManageList();
      showToast('已添加');
    } catch (err) {
      showToast(err.message);
    }
  }

  async function renderRewards() {
    try {
      // 获取徽章和排行榜数据
      const badgesResult = await apiRequest('/api/rewards/badges');
      const badges = badgesResult.data;
      const leaderboardResult = await apiRequest('/api/rewards/leaderboard');
      const leaderboard = leaderboardResult.data;
      
      // 计算等级和经验值
      const points = state.user.points || 0;
      const level = calculateLevel(points);
      const expForNextLevel = getExpForLevel(level + 1);
      const expForCurrentLevel = getExpForLevel(level);
      const currentExp = points - expForCurrentLevel;
      const expNeeded = expForNextLevel - expForCurrentLevel;
      const expPercent = Math.min((currentExp / expNeeded) * 100, 100);
      
      // 更新用户信息
      $('profileLevel').textContent = `Lv.${level}`;
      $('levelBadge').textContent = getLevelTitle(level);
      $('profileName').textContent = state.user.username;
      $('profileTitle').textContent = getLevelDescription(level);
      
      // 更新经验条
      $('currentExp').textContent = currentExp;
      $('nextLevelExp').textContent = expNeeded;
      $('expFill').style.width = `${expPercent}%`;
      $('expNeeded').textContent = expNeeded - currentExp;
      $('nextLevel').textContent = level + 1;
      
      // 更新统计数据
      $('streakDays').textContent = state.user.streak || 0;
      $('totalMistakes').textContent = (state.items || []).length;
      $('reviewedCount').textContent = (state.items || []).filter(i => i.reviewed).length;
      $('totalPoints').textContent = points;
      
      // 渲染徽章
      const unlockedCount = badges.filter(b => b.unlocked).length;
      $('badgeCount').textContent = unlockedCount;
      
      const badgesContainer = $('badgesList');
      badgesContainer.innerHTML = badges.map(b => `
        <div class="badge-item ${b.unlocked ? 'unlocked' : 'locked'}">
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-name">${b.name}</div>
          ${b.unlocked ? '<div class="badge-check">✓</div>' : ''}
        </div>
      `).join('');
      
      // 渲染等级特权
      const privileges = getLevelPrivileges(level);
      const unlockedPrivilegeCount = privileges.filter(p => p.unlocked).length;
      $('unlockedPrivilegeCount').textContent = unlockedPrivilegeCount;
      
      const privilegesContainer = $('privilegesList');
      privilegesContainer.innerHTML = privileges.map((p, i) => `
        <div class="privilege-item ${p.unlocked ? 'unlocked' : 'locked'}">
          <div class="privilege-icon">${p.icon}</div>
          <div class="privilege-content">
            <span class="privilege-title">${p.title}</span>
            <span class="privilege-desc">${p.desc}</span>
          </div>
          <div class="privilege-status">
            ${p.unlocked ? '<span class="status-unlocked">✓</span>' : `<span class="status-locked">Lv.${i + 1}</span>`}
          </div>
        </div>
      `).join('');
      
      // 渲染排行榜
      const lbContainer = $('leaderboardList');
      lbContainer.innerHTML = leaderboard.map((u, i) => {
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
        const isMe = u.id === state.user.id;
        return `
          <div class="leaderboard-item ${isMe ? 'me' : ''}">
            <div class="leaderboard-rank ${rankClass}">${i + 1}</div>
            <div class="leaderboard-info">
              <span class="leaderboard-name">${escapeHtml(u.username)}</span>
              <span class="leaderboard-streak">🔥 ${u.streak || 0}天连续</span>
            </div>
            <span class="leaderboard-points">${u.points}</span>
          </div>
        `;
      }).join('');
      
    } catch (err) {
      showToast(err.message);
    }
  }
  
  // 计算等级（12级系统）
  function calculateLevel(points) {
    if (points < 100) return 1;
    if (points < 250) return 2;
    if (points < 500) return 3;
    if (points < 1000) return 4;
    if (points < 2000) return 5;
    if (points < 4000) return 6;
    if (points < 7000) return 7;
    if (points < 11000) return 8;
    if (points < 16000) return 9;
    if (points < 22000) return 10;
    if (points < 30000) return 11;
    return 12;
  }
  
  // 获取升级所需经验
  function getExpForLevel(level) {
    const thresholds = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 11000, 16000, 22000, 30000];
    if (level <= thresholds.length) return thresholds[level - 1] || 0;
    return thresholds[thresholds.length - 1] + (level - thresholds.length) * 8000;
  }
  
  // 获取等级称号
  function getLevelTitle(level) {
    const titles = [
      '新手', '入门', '进阶', '熟练', '精通', '大师',
      '专家', '学霸', '学神', '宗师', '传奇', '至尊'
    ];
    return titles[Math.min(level - 1, titles.length - 1)] || '至尊';
  }
  
  // 获取等级描述
  function getLevelDescription(level) {
    const desc = [
      '错题整理新手，开始你的学习之旅',
      '初窥门径，学习习惯养成中',
      '稳步前进，掌握基本整理技巧',
      '游刃有余，错题管理得心应手',
      '融会贯通，学习效率大幅提升',
      '登堂入室，错题整理自成一派',
      '精益求精，成为学习专家',
      '独占鳌头，学霸级人物',
      '超凡脱俗，学神降临',
      '一代宗师，引领学习潮流',
      '传奇人物，成就非凡',
      '至尊无上，学习王者'
    ];
    return desc[Math.min(level - 1, desc.length - 1)] || '至尊无上，学习王者';
  }
  
  // 获取等级特权
  function getLevelPrivileges(level) {
    const privileges = [
      { title: '基础功能', desc: '错题录入、分类管理', icon: '📚', unlocked: true },
      { title: 'AI问答', desc: '每天3次AI答疑', icon: '🤖', unlocked: level >= 2 },
      { title: '错题导出', desc: '导出错题PDF', icon: '📤', unlocked: level >= 3 },
      { title: '自定义标签', desc: '创建专属标签', icon: '🏷️', unlocked: level >= 4 },
      { title: '学习报告', desc: '查看学习数据分析', icon: '📊', unlocked: level >= 5 },
      { title: '每日提醒', desc: '错题复习提醒', icon: '🔔', unlocked: level >= 6 },
      { title: '错题分析', desc: 'AI智能分析错题', icon: '🧠', unlocked: level >= 7 },
      { title: '深度辅导', desc: 'AI一对一深度讲解', icon: '💡', unlocked: level >= 8 },
      { title: '专属题库', desc: '获取定制化练习题', icon: '📝', unlocked: level >= 9 },
      { title: '学习计划', desc: 'AI定制学习计划', icon: '📅', unlocked: level >= 10 },
      { title: '全部特权', desc: '解锁所有功能', icon: '⭐', unlocked: level >= 11 },
      { title: '无限特权', desc: '尊享无限使用', icon: '👑', unlocked: level >= 12 }
    ];
    return privileges;
  }

  function initAIChat() {
    const chatContainer = $('aiChat');
    if (chatContainer.children.length === 0) {
      chatContainer.innerHTML = `
        <div style="text-align:center;padding:40px 20px 20px;">
          <div style="font-size:48px;margin-bottom:12px;">🤖</div>
          <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px;">AI 学习助手</div>
          <div style="font-size:13px;color:var(--text-muted);">我是你的专属学习助手，可以帮你解答问题、分析错题</div>
        </div>
        <div class="ai-quick-actions">
          <button class="quick-btn" data-q="如何高效复习错题？">📝 如何高效复习错题？</button>
          <button class="quick-btn" data-q="帮我分析一道数学题的解题思路">🧮 数学题解题思路</button>
          <button class="quick-btn" data-q="怎样提高英语阅读能力？">📚 提高英语阅读</button>
        </div>
      `;
      $$('.quick-btn', chatContainer).forEach(btn => {
        btn.addEventListener('click', () => {
          $('aiInput').value = btn.dataset.q;
          $('aiInput').focus();
        });
      });
    }
  }

  async function handleAIAsk() {
    const question = $('aiInput').value.trim();
    if (!question) {
      showToast('请输入问题');
      return;
    }

    const chatContainer = $('aiChat');
    chatContainer.innerHTML += `<div class="chat-message user"><div class="chat-avatar">👤</div><div class="chat-bubble"><p>${escapeHtml(question)}</p></div></div>`;
    chatContainer.innerHTML += `<div class="chat-message ai loading"><div class="chat-avatar">🤖</div><div class="chat-bubble"></div></div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      const result = await apiRequest('/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question })
      });
      chatContainer.innerHTML = chatContainer.innerHTML.replace(
        '<div class="chat-message ai loading"><div class="chat-avatar">🤖</div><div class="chat-bubble"></div></div>',
        `<div class="chat-message ai"><div class="chat-avatar">🤖</div><div class="chat-bubble"><p>${escapeHtml(result.answer)}</p></div></div>`
      );
    } catch (err) {
      chatContainer.innerHTML = chatContainer.innerHTML.replace(
        '<div class="chat-message ai loading"><div class="chat-avatar">🤖</div><div class="chat-bubble"></div></div>',
        `<div class="chat-message ai error"><div class="chat-avatar">🤖</div><div class="chat-bubble"><p>${escapeHtml(err.message)}</p></div></div>`
      );
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
    $('aiInput').value = '';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function bindEvents() {
    $$('.tab-item').forEach(t => {
      t.addEventListener('click', () => {
        const v = t.dataset.view;
        if (v === 'home') { switchView('home'); renderHome(); }
        else if (v === 'upload') { enterUpload({}); }
        else if (v === 'list') { enterList(); }
        else if (v === 'rewards') { switchView('rewards'); renderRewards(); }
        else if (v === 'ai') { switchView('ai'); initAIChat(); }
        else if (v === 'profile') { switchView('profile'); renderProfile(); }
      });
    });

    $('backBtn').addEventListener('click', () => {
      if (currentView === 'detail') { enterList(); }
      else if (currentView === 'manage') { enterList(); }
      else if (currentView === 'upload' && !editingId) { switchView('home'); renderHome(); }
      else if (currentView === 'upload' && editingId) { enterList(); }
      else if (currentView === 'rewards') { switchView('home'); renderHome(); }
      else if (currentView === 'ai') { switchView('home'); renderHome(); }
      else if (currentView === 'practice') { switchView('detail'); }
      else { switchView('home'); renderHome(); }
    });

    $('loginBtn').addEventListener('click', handleLogin);
    $('registerBtn').addEventListener('click', handleRegister);
    $('toRegisterBtn').addEventListener('click', () => switchView('register'));
    $('toLoginBtn').addEventListener('click', () => switchView('login'));

    $('heroCameraBtn').addEventListener('click', () => {
      switchView('upload');
    });

    $('profileLogoutBtn').addEventListener('click', () => {
      showDialog('确认退出', '确定要退出登录吗？', () => {
        clearAuth();
        switchView('login');
      });
    });

    $('editEmailBtn').addEventListener('click', () => {
      const current = (state.user && state.user.email) || '';
      showInputDialog('修改邮箱', '请输入新邮箱', current, async (val) => {
        if (!val) { showToast('邮箱不能为空'); return; }
        try {
          await apiRequest('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ email: val })
          });
          state.user.email = val;
          saveAuth(state.user, state.token);
          renderProfile();
          showToast('邮箱已更新');
        } catch (err) {
          showToast('更新失败: ' + err.message);
        }
      });
    });

    $('editPasswordBtn').addEventListener('click', () => {
      // 用自定义对话框替代 prompt()，避免在 iframe 中不支持
      showInputDialog('修改密码', '请输入当前密码', '', (oldPwd) => {
        if (!oldPwd) { showToast('请输入当前密码'); return; }
        showInputDialog('修改密码', '请输入新密码（至少6位）', '', (newPwd) => {
          if (!newPwd || newPwd.length < 6) { showToast('新密码至少6位'); return; }
          showInputDialog('修改密码', '请再次输入新密码', '', (confirmPwd) => {
            if (newPwd !== confirmPwd) { showToast('两次输入的新密码不一致'); return; }
            apiRequest('/api/auth/password', {
              method: 'PUT',
              body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
            }).then(() => {
              showToast('密码修改成功，请重新登录');
              setTimeout(() => {
                clearAuth();
                switchView('login');
              }, 1500);
            }).catch(err => {
              showToast('密码修改失败: ' + err.message);
            });
          });
        });
      });
    });

    $('editPhoneBtn').addEventListener('click', () => {
      const current = (state.user && state.user.phone) || '';
      showInputDialog('绑定手机号', '请输入手机号', current, (val) => {
        const trimmed = (val || '').trim();
        if (!trimmed) { showToast('手机号不能为空'); return; }
        if (!/^1[3-9]\d{9}$/.test(trimmed)) { showToast('请输入有效的手机号'); return; }
        apiRequest('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ phone: trimmed })
        }).then(() => {
          state.user.phone = trimmed;
          saveAuth(state.user, state.token);
          renderProfile();
          showToast('手机号已绑定');
        }).catch(err => {
          showToast('绑定失败: ' + err.message);
        });
      });
    });

    // 切换到"我的"页面时刷新数据
    document.querySelectorAll('.tab-item[data-view="profile"]').forEach(b => {
      b.addEventListener('click', () => renderProfile());
    });

    $('menuBtn').addEventListener('click', () => {
      showDialog('错题本 · 使用说明',
        '• 拍照或从相册上传错题照片\n• 系统会根据备注自动识别学科\n• 可按学科 / 章节自由分类\n• AI小助手可以帮你分析错题\n• 连续打卡可获得徽章奖励\n\n点击"确定"进入学科管理',
        () => openManage('subject'));
    });

    $('toAllBtn').addEventListener('click', () => {
      enterList();
    });
    $('toSubjectsBtn').addEventListener('click', () => openManage('subject'));

    $('photoBtn').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      handleFile(f);
    });
    $('rechooseBtn').addEventListener('click', () => $('fileInput').click());
    $('addAllBtn').addEventListener('click', addAllQuestions);
    initCropEvents();

    $('listSubjectSelect').addEventListener('change', () => {
      $('listChapterSelect').value = '';
      loadListPage(true).then(renderList);
    });
    $('listChapterSelect').addEventListener('change', () => loadListPage(true).then(renderList));
    let searchTimer = null;
    $('searchInput').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadListPage(true).then(renderList), 300);
    });
    $('manageSubjectBtn').addEventListener('click', () => openManage('subject'));
    $('manageChapterBtn').addEventListener('click', () => {
      const subjId = $('listSubjectSelect').value;
      const subjects = Array.isArray(state.subjects) ? state.subjects : [];
      if (subjects.length === 0) {
        showToast('暂无学科，请先添加学科');
        return;
      }
      let subject;
      if (subjId) {
        subject = subjects.find(s => String(s.id) === subjId);
      }
      if (!subject) {
        showToast('请先在上方选择一个学科');
        return;
      }
      openManage('chapter', subject);
    });

    $('deleteBtn').addEventListener('click', async () => {
      if (!detailItem) return;
      showDialog('删除错题', '删除后无法恢复，确定删除吗？', async () => {
        try {
          await apiRequest(`/api/mistakes/${detailItem.id}`, { method: 'DELETE' });
          const currentItems = Array.isArray(state.items) ? state.items : [];
          state.items = currentItems.filter(i => i.id !== detailItem.id);
          showToast('已删除');
          enterList();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
    $('editBtn').addEventListener('click', () => {
      if (!detailItem) return;
      enterUpload({ editing: true, item: detailItem });
    });

    $('addItemBtn').addEventListener('click', handleAddItem);
    $('newItemInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddItem();
    });

    $('aiSendBtn').addEventListener('click', handleAIAsk);
    $('aiInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAIAsk();
      }
    });

    $('analyzeBtn').addEventListener('click', handleAnalyzeMistake);
    $('generatePracticeBtn').addEventListener('click', handleGeneratePractice);
    $('ocrBtn').addEventListener('click', handleOCR);
  }

  async function handleOCR() {
    if (!detailItem) return;
    let imgUrl = detailItem.imageUrl;
    if (!imgUrl) { showToast('该错题没有图片'); return; }
    if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) imgUrl = '/' + imgUrl;

    const btn = $('ocrBtn');
    const progress = $('ocrProgress');
    btn.textContent = '识别中...';
    btn.disabled = true;
    progress.classList.remove('hidden');
    progress.textContent = '正在识别图片文字...';

    try {
      const result = await apiRequest('/api/mistakes/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imgUrl })
      });
      const text = (result.text || '').trim();
      const questions = Array.isArray(result.questions) ? result.questions : [];
      if (text) {
        // 把第一题填到当前错题
        const firstQ = questions.length > 0 ? questions[0] : text;
        detailItem.question = firstQ;
        await apiRequest('/api/mistakes/' + detailItem.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: firstQ })
        });
        const extra = questions.length > 1 ? `（共识别 ${questions.length} 题）` : '';
        showToast('识别完成，已填入题目' + extra);
        // 进入编辑模式：将识别到的题目装入多题面板
        enterUpload({ editing: true, item: detailItem });
      } else {
        showToast('未识别到文字');
      }
    } catch (err) {
      showToast('识别失败: ' + err.message);
    } finally {
      btn.textContent = '📷 识别图片文字';
      btn.disabled = false;
      progress.classList.add('hidden');
    }
  }

  async function handleAnalyzeMistake() {
    if (!detailItem) return;
    
    const analyzeBtn = $('analyzeBtn');
    analyzeBtn.textContent = '分析中...';
    analyzeBtn.disabled = true;

    try {
      const result = await apiRequest(`/api/mistakes/${detailItem.id}/analyze`, {
        method: 'POST'
      });

      $('analysisErrorType').textContent = result.errorType || '未分类';
      $('analysisErrorPoint').textContent = result.errorPoint || '未识别';
      $('analysisContent').textContent = result.mistake.analysis || '无详细分析';
      $('detailAnalysis').style.display = 'block';

      detailItem.errorType = result.errorType;
      detailItem.errorPoint = result.errorPoint;
      detailItem.analysis = result.mistake.analysis;

      showToast('AI分析完成');
    } catch (err) {
      showToast(err.message || '分析失败');
    } finally {
      analyzeBtn.textContent = 'AI分析';
      analyzeBtn.disabled = false;
    }
  }

  async function handleGeneratePractice() {
    if (!detailItem || !detailItem.errorType || !detailItem.errorPoint) {
      showToast('请先进行AI分析');
      return;
    }

    const btn = $('generatePracticeBtn');
    btn.textContent = '生成中...';
    btn.disabled = true;

    try {
      const result = await apiRequest('/api/ai/generate-practice', {
        method: 'POST',
        body: JSON.stringify({
          errorType: detailItem.errorType,
          errorPoint: detailItem.errorPoint
        })
      });

      showToast('练习生成成功！');
      switchView('practice');
      renderPractice(result.exercises);
    } catch (err) {
      showToast(err.message || '练习生成失败');
    } finally {
      btn.textContent = '生成专项练习';
      btn.disabled = false;
    }
  }

  let currentPractice = [];
  function renderPractice(exercises) {
    currentPractice = exercises;
    const container = $('practiceContainer');
    container.innerHTML = exercises.map((ex, index) => `
      <div class="practice-item">
        <div class="practice-header">
          <span class="practice-number">第${index + 1}题</span>
          <span class="practice-tag">${ex.errorType}</span>
        </div>
        <div class="practice-question">${escapeHtml(ex.question)}</div>
        <div class="practice-options">${ex.options.split('\n').map(opt => `<div class="option-item">${escapeHtml(opt)}</div>`).join('')}</div>
        <input type="text" class="practice-answer" placeholder="输入答案（如：A）" data-id="${ex.id}" />
        <button class="primary-btn practice-submit-btn" data-id="${ex.id}">提交答案</button>
        <div class="practice-result" id="result-${ex.id}" style="display:none;"></div>
      </div>
    `).join('');

    document.querySelectorAll('.practice-submit-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const exerciseId = parseInt(e.target.dataset.id);
        const input = document.querySelector(`input[data-id="${exerciseId}"]`);
        const answer = input.value.trim().toUpperCase();
        
        if (!answer) {
          showToast('请输入答案');
          return;
        }

        const resultDiv = document.getElementById(`result-${exerciseId}`);
        
        try {
          const result = await apiRequest(`/api/practice/${exerciseId}/submit`, {
            method: 'PUT',
            body: JSON.stringify({ answer })
          });

          resultDiv.innerHTML = `
            <div class="result-${result.correct ? 'correct' : 'wrong'}">
              ${result.correct ? '🎉 回答正确！' : '❌ 回答错误'}
              <div class="correct-answer">正确答案：${result.exercise.answer}</div>
              <div class="analysis">${escapeHtml(result.exercise.analysis)}</div>
            </div>
          `;
          resultDiv.style.display = 'block';
          
          if (result.correct) {
            showToast('回答正确！');
          }
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  function init() {
    // 每次打开页面都从登录界面开始，不自动登录
    clearAuth();
    bindEvents();
    switchView('login');
    $$('.tabbar').forEach(t => t.classList.add('hidden'));
    $('topbar').classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
