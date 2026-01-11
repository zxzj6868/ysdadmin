// Global Supabase Client
var supabase = null;

// Init Chart
function initChart() {
    var ctx = document.getElementById('growthChart');
    if(!ctx) return; // Prevent error if element missing
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            datasets: [{
                label: '每日活跃用户',
                data: [120, 150, 180, 220, 200, 350, 310],
                borderColor: '#3498db',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Init
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded. Checking dependencies...");

    // Safe Chart Init
    if(typeof Chart !== 'undefined') {
        try { initChart(); } catch(e) { console.error("Chart init failed:", e); }
    } else {
        console.warn("Chart.js not loaded. Charts will not be displayed.");
    }
    
    // Check Supabase SDK
    if(typeof window.supabase === 'undefined') {
        console.error("CRITICAL: Supabase SDK object not found on window!");
        // If SDK failed to load due to syntax error in file, we can't do much but alert
        alert("系统加载失败: 核心组件损坏。正在尝试自动修复...");
        return;
    }
    
    // Load config if exists
    var savedUrl = localStorage.getItem('supabase_url');
    var savedKey = localStorage.getItem('supabase_key');
    
    if(savedUrl && savedKey) {
        document.getElementById('supabase-url').value = savedUrl;
        document.getElementById('supabase-key').value = savedKey;
        
        // Initialize Supabase
        try {
            if(window.supabase) {
                supabase = window.supabase.createClient(savedUrl, savedKey);
                console.log("Supabase initialized");
                
                // Auto-load data if on specific tabs
                if(document.getElementById('users').classList.contains('active')) fetchUsers();
                if(document.getElementById('ear').classList.contains('active')) fetchEarResources();
                if(document.getElementById('sync').classList.contains('active')) fetchSyncContent();
                if(document.getElementById('dashboard').classList.contains('active')) fetchDashboardStats();
            } else {
                console.error("Supabase SDK not loaded");
            }
        } catch(e) {
            console.error("Failed to init Supabase:", e);
        }
    }
});

// Config Storage
function saveConfig() {
    var url = document.getElementById('supabase-url').value;
    var key = document.getElementById('supabase-key').value;
    
    if(url && key) {
        localStorage.setItem('supabase_url', url);
        localStorage.setItem('supabase_key', key);
        alert('配置已保存！正在刷新页面以连接数据库...');
        location.reload(); 
    } else {
        alert('请输入完整的配置信息');
    }
}

// Data Fetching: Dashboard
async function fetchDashboardStats() {
    if(!supabase) return;
    
    // Count Users
    const { count: userCount, error: err1 } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if(!err1) document.querySelector('.card:nth-child(1) .card-num').innerText = userCount || 0;
    
    // Count VIPs
    const { count: vipCount, error: err2 } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('membership_type', 'vip');
    if(!err2) document.querySelector('.card:nth-child(4) .card-num').innerText = vipCount || 0;
    
    // For demo, we keep other stats as mock or calculate from logs
}

// Data Fetching: Users
async function fetchUsers() {
    if(!supabase) return;
    
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    
    if(error) {
        console.error("Error fetching users:", error);
        return;
    }
    
    var tbody = document.querySelector('#users .data-table tbody');
    tbody.innerHTML = ''; // Clear mock data
    
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">暂无用户数据</td></tr>';
        return;
    }
    
    data.forEach(user => {
        var row = `
            <tr>
                <td>#${user.id.substring(0, 8)}...</td>
                <td>${user.display_name || '未命名'}</td>
                <td>${user.phone || '-'}</td>
                <td><span class="tag ${user.membership_type === 'vip' ? 'vip' : 'free'}">${user.membership_type === 'vip' ? 'VIP' : '免费'}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td><button class="btn-text" onclick="alert('编辑功能待开发')">编辑</button></td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

// Data Fetching: Ear Resources
async function fetchEarResources() {
    if(!supabase) return;
    
    const { data, error } = await supabase.from('ear_tracks').select('*').order('created_at', { ascending: false });
    
    if(error) {
        console.error("Error fetching ear tracks:", error);
        return;
    }
    
    var tbody = document.querySelector('#ear .data-table tbody');
    tbody.innerHTML = ''; // Clear mock data
    
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">暂无资源，请点击“上传资源”添加</td></tr>';
        return;
    }
    
    data.forEach(track => {
        var row = `
            <tr>
                <td>${track.title}</td>
                <td>${track.category || '通用'}</td>
                <td>${formatDuration(track.duration)}</td>
                <td>-</td>
                <td><button class="btn-text" style="color:red" onclick="deleteEarTrack(${track.id})">删除</button></td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function formatDuration(seconds) {
    if(!seconds) return '--:--';
    var min = Math.floor(seconds / 60);
    var sec = seconds % 60;
    return `${min}:${sec < 10 ? '0'+sec : sec}`;
}

// Modal Logic
function showModal(id) {
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function showAddGradeModal(levelId) {
    document.getElementById('target-level-id').value = levelId;
    showModal('add-grade-modal');
}

// Data Actions: Add Sync Level
async function addSyncLevel() {
    var name = document.getElementById('new-level-name').value;
    if(!name) return alert('请输入名称');
    
    const { error } = await supabase.from('levels').insert({ name: name, type: 'sync' });
    
    if(error) {
        alert('添加失败: ' + error.message);
    } else {
        closeModal('add-sync-modal');
        fetchSyncContent(); // Refresh
        document.getElementById('new-level-name').value = '';
    }
}

// Data Actions: Add Grade
async function addGrade() {
    var name = document.getElementById('new-grade-name').value;
    var levelId = document.getElementById('target-level-id').value;
    
    if(!name) return alert('请输入名称');
    
    const { error } = await supabase.from('grades').insert({ name: name, level_id: levelId });
    
    if(error) {
        alert('添加失败: ' + error.message);
    } else {
        closeModal('add-grade-modal');
        fetchSyncContent(); // Refresh
        document.getElementById('new-grade-name').value = '';
    }
}

// --- SYNC STUDY NAVIGATION & CRUD ---

// State
var currentLevel = null;
var currentGrade = null;
var currentUnit = null;
var currentLesson = null;

function resetSyncView() {
    document.getElementById('sync-view-grades').style.display = 'block';
    document.getElementById('sync-view-units').style.display = 'none';
    document.getElementById('sync-view-lessons').style.display = 'none';
    document.getElementById('sync-view-editor').style.display = 'none';
    document.getElementById('sync-breadcrumb').style.display = 'none';
    fetchSyncContent();
}

function updateBreadcrumb(text) {
    document.getElementById('sync-breadcrumb').style.display = 'block';
    document.getElementById('breadcrumb-dynamic').innerText = text;
}

// 1. Grade List (Existing fetchSyncContent) -> click openGrade(id, name)
async function openGrade(id, name) {
    currentGrade = {id, name};
    document.getElementById('sync-view-grades').style.display = 'none';
    document.getElementById('sync-view-units').style.display = 'block';
    updateBreadcrumb(`${name}`);
    document.getElementById('current-grade-title').innerText = `${name} - 单元列表`;
    
    fetchUnits(id);
}

// 2. Unit List
async function fetchUnits(gradeId) {
    const { data: units, error } = await supabase.from('units').select('*').eq('grade_id', gradeId).order('id');
    var container = document.getElementById('unit-list');
    container.innerHTML = '';
    
    if(!units || units.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#999">暂无单元，请添加</div>';
        return;
    }

    units.forEach(u => {
        container.insertAdjacentHTML('beforeend', `
            <div class="card" onclick="openUnit(${u.id}, '${u.name}')">
                <div class="card-title">${u.name}</div>
                <div style="font-size:12px;color:#666">${u.title || ''}</div>
                <button class="btn-text" style="margin-top:10px" onclick="event.stopPropagation(); deleteUnit(${u.id})">删除</button>
            </div>
        `);
    });
}

async function addUnit() {
    var name = document.getElementById('new-unit-name').value;
    var title = document.getElementById('new-unit-title').value;
    if(!name) return alert('请输入名称');
    
    const { error } = await supabase.from('units').insert({ name, title, grade_id: currentGrade.id });
    if(error) alert(error.message);
    else {
        closeModal('add-unit-modal');
        fetchUnits(currentGrade.id);
        document.getElementById('new-unit-name').value = '';
        document.getElementById('new-unit-title').value = '';
    }
}

function showAddUnitModal() { showModal('add-unit-modal'); }
async function deleteUnit(id) {
    if(!confirm('删除单元?')) return;
    await supabase.from('units').delete().eq('id', id);
    fetchUnits(currentGrade.id);
}

// 3. Lesson List
async function openUnit(id, name) {
    currentUnit = {id, name};
    document.getElementById('sync-view-units').style.display = 'none';
    document.getElementById('sync-view-lessons').style.display = 'block';
    updateBreadcrumb(`${currentGrade.name} > ${name}`);
    document.getElementById('current-unit-title').innerText = `${name} - 课程列表`;
    
    fetchLessons(id);
}

async function fetchLessons(unitId) {
    const { data: lessons } = await supabase.from('lessons').select('*').eq('unit_id', unitId).order('order_index');
    var tbody = document.getElementById('lesson-list');
    tbody.innerHTML = '';
    
    if(!lessons || lessons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" align="center">暂无课程</td></tr>';
        return;
    }

    lessons.forEach(l => {
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${l.name}</td>
                <td>${l.video_url ? '✅ 已配置' : '❌ 未配置'}</td>
                <td><button class="btn-small" onclick="openEditor(${l.id}, '${l.name}')">编辑内容</button></td>
                <td><button class="btn-text" style="color:red" onclick="deleteLesson(${l.id})">删除</button></td>
            </tr>
        `);
    });
}

async function addLesson() {
    var name = document.getElementById('new-lesson-name').value;
    if(!name) return alert('请输入名称');
    
    const { error } = await supabase.from('lessons').insert({ name, unit_id: currentUnit.id });
    if(error) alert(error.message);
    else {
        closeModal('add-lesson-modal');
        fetchLessons(currentUnit.id);
        document.getElementById('new-lesson-name').value = '';
    }
}

function showAddLessonModal() { showModal('add-lesson-modal'); }
async function deleteLesson(id) {
    if(!confirm('删除课程?')) return;
    await supabase.from('lessons').delete().eq('id', id);
    fetchLessons(currentUnit.id);
}

// 4. Content Editor (Video + Dialogues)
async function openEditor(id, name) {
    currentLesson = {id, name};
    document.getElementById('sync-view-lessons').style.display = 'none';
    document.getElementById('sync-view-editor').style.display = 'block';
    updateBreadcrumb(`${currentGrade.name} > ${currentUnit.name} > ${name}`);
    document.getElementById('editor-lesson-title').innerText = `编辑: ${name}`;
    
    // Fetch details
    const { data: lesson } = await supabase.from('lessons').select('*').eq('id', id).single();
    document.getElementById('editor-video-url').value = lesson.video_url || '';
    document.getElementById('editor-cover-url').value = lesson.cover_url || '';
    
    fetchDialogues(id);
}

async function saveLessonMeta() {
    var video = document.getElementById('editor-video-url').value;
    var cover = document.getElementById('editor-cover-url').value;
    
    const { error } = await supabase.from('lessons').update({ video_url: video, cover_url: cover }).eq('id', currentLesson.id);
    if(error) alert('保存失败');
    else alert('基础信息已保存');
}

async function fetchDialogues(lessonId) {
    const { data: diags } = await supabase.from('dialogues').select('*').eq('lesson_id', lessonId).order('order_index');
    var tbody = document.getElementById('dialogue-list');
    tbody.innerHTML = '';
    
    if(!diags || diags.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" align="center">暂无对话</td></tr>';
        return;
    }

    diags.forEach(d => {
        var hlText = d.highlights ? d.highlights.map(h => `${h.word}:${h.color||h.type}`).join(', ') : '-';
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${d.speaker}</td>
                <td>${d.text}</td>
                <td>${hlText}</td>
                <td>${d.order_index}</td>
                <td><button class="btn-text" style="color:red" onclick="deleteDialogue(${d.id})">删除</button></td>
            </tr>
        `);
    });
}

async function addDialogue() {
    var speaker = document.getElementById('diag-speaker').value;
    var text = document.getElementById('diag-text').value;
    var hlStr = document.getElementById('diag-highlights').value; // "apple:red, boy:bold"
    
    // Parse highlights
    var highlights = [];
    if(hlStr) {
        hlStr.split(',').forEach(part => {
            var [word, style] = part.split(':');
            if(word && style) {
                highlights.push({ word: word.trim(), color: style.trim() === 'bold' ? null : style.trim(), type: style.trim() === 'bold' ? 'bold' : null });
            }
        });
    }

    const { error } = await supabase.from('dialogues').insert({
        lesson_id: currentLesson.id,
        speaker,
        text,
        highlights: highlights.length ? highlights : []
    });

    if(error) alert(error.message);
    else {
        closeModal('add-dialogue-modal');
        fetchDialogues(currentLesson.id);
        document.getElementById('diag-text').value = '';
        document.getElementById('diag-highlights').value = '';
    }
}

function showAddDialogueModal() { showModal('add-dialogue-modal'); }
async function deleteDialogue(id) {
    if(!confirm('删除?')) return;
    await supabase.from('dialogues').delete().eq('id', id);
    fetchDialogues(currentLesson.id);
}

// Data Fetching: Sync Content
async function fetchSyncContent() {
    console.log("Starting fetchSyncContent...");
    
    if(!supabase) {
        console.warn("Supabase client is null. Attempting to re-init...");
        // Try to re-init if config exists
        var savedUrl = localStorage.getItem('supabase_url');
        var savedKey = localStorage.getItem('supabase_key');
        if(savedUrl && savedKey && window.supabase) {
             try {
                 supabase = window.supabase.createClient(savedUrl, savedKey);
                 console.log("Supabase re-initialized");
             } catch(e) {
                 console.error("Re-init failed:", e);
                 document.getElementById('sync-tree').innerHTML = '<div style="color:red;text-align:center">数据库连接失败，请检查配置</div>';
                 return;
             }
        } else {
             console.error("No config found or SDK missing");
             document.getElementById('sync-tree').innerHTML = '<div style="color:red;text-align:center">未配置数据库连接，请前往设置页面</div>';
             return;
        }
    }
    
    try {
        // Fetch levels
        console.log("Querying levels table...");
        const { data: levels, error } = await supabase.from('levels').select('*').eq('type', 'sync').order('id');
        
        if(error) {
            console.error("Error fetching levels:", error);
            // Check for common errors
            if(error.code === '42P01') { // undefined_table
                 document.getElementById('sync-tree').innerHTML = '<div style="color:red;text-align:center">错误: 数据库表不存在。请确保运行了 SQL 建表脚本。</div>';
            } else if (error.message === 'FetchError: Failed to fetch') {
                 document.getElementById('sync-tree').innerHTML = '<div style="color:red;text-align:center">网络错误: 无法连接到 Supabase。请检查网络或 URL 配置。</div>';
            } else {
                 document.getElementById('sync-tree').innerHTML = `<div style="color:red;text-align:center">加载失败: ${error.message} (Code: ${error.code})</div>`;
            }
            return;
        }
        
        console.log("Levels fetched:", levels);
        var container = document.getElementById('sync-tree');
        container.innerHTML = '';
        
        if(!levels || levels.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#666">暂无课程阶段，请点击上方“+ 新增同步课程”按钮添加数据</div>';
            return;
        }
        
        for (let level of levels) {
            // Fetch grades for this level
            const { data: grades } = await supabase.from('grades').select('*').eq('level_id', level.id).order('id');
            
            var gradeHtml = grades ? grades.map(g => `
                <div class="tree-sub-item">
                    <span>📘 ${g.name}</span>
                    <div>
                        <button class="btn-small" onclick="openGrade(${g.id}, '${g.name}')">管理单元</button>
                        <button class="btn-small" style="color:red" onclick="deleteGrade(${g.id})">删除</button>
                    </div>
                </div>
            `).join('') : '';

            var html = `
                <div class="tree-item">
                    <span>📂 ${level.name}</span>
                    <button class="btn-small" onclick="showAddGradeModal(${level.id})">+ 年级</button>
                </div>
                ${gradeHtml}
            `;
            container.insertAdjacentHTML('beforeend', html);
        }
    } catch (err) {
        console.error("Unexpected error in fetchSyncContent:", err);
        document.getElementById('sync-tree').innerHTML = `<div style="color:red;text-align:center">发生意外错误: ${err.message}</div>`;
    }
}

async function deleteGrade(id) {
    if(!confirm('确定删除该年级吗？')) return;
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if(!error) fetchSyncContent();
}

// Tab Switching (Updated to trigger fetch)
function switchTab(tabId) {
    // Update Menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if(item.textContent.includes(getTabName(tabId))) {
            item.classList.add('active');
        }
    });

    // Update Content
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    
    // Update Title
    document.getElementById('page-title').innerText = getTabName(tabId);
    
    // Trigger Data Load
    if(tabId === 'users') fetchUsers();
    if(tabId === 'ear') fetchEarResources();
    if(tabId === 'dashboard') fetchDashboardStats();
    if(tabId === 'sync') resetSyncView();
}

function getTabName(id) {
    const map = {
        'dashboard': '数据概览',
        'users': '会员/用户管理',
        'sync': '同步学课程管理',
        'self': '自选课管理',
        'custom': '定制内容配置',
        'ear': '磨耳朵资源管理',
        'settings': '系统设置'
    };
    return map[id] || '管理后台';
}