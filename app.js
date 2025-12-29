// ==========================================
// 📌 app.js (แก้ CORS ด้วย Script Tag)
// ==========================================

// ⚠️ ใส่ Web App URL ของคุณ (ต้องลงท้ายด้วย /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbyO2H4xvC6NvrS01gdtK4ed1o4CspiYocwQPD0Ndkz3U-BgZLm7doCHn22pMu9v_ky7-A/exec";

let allData = [];
let filteredData = [];
const itemsPerPage = 12;
let currentPage = 1;

window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  populateFilters();
  renderGrid();
  setupEventListeners();
});

// ==========================================
// แก้ CORS ด้วย Script Tag
// ==========================================
function loadData() {
  return new Promise((resolve, reject) => {
    console.log('🔄 กำลังโหลดข้อมูล... - app.js:25');
    
    // สร้าง callback function
    window.handleApiResponse = function(data) {
      console.log('✅ รับข้อมูลสำเร็จ: - app.js:29', data.length, 'รายการ');
      if (data.length > 0) {
        console.log('📋 ตัวอย่างข้อมูล: - app.js:31', data[0]);
        console.log('📌 คอลัมน์ทั้งหมด: - app.js:32', Object.keys(data[0]));
      }
      
      allData = data;
      filteredData = [...data];
      
      // ลบ script tag ออก
      const script = document.getElementById('api-script');
      if (script) script.remove();
      
      resolve();
    };
    
    // สร้าง script tag เพื่อดึงข้อมูล
    const script = document.createElement('script');
    script.id = 'api-script';
    script.src = API_URL + '?callback=handleApiResponse';
    script.onerror = () => {
      console.error('❌ ไม่สามารถโหลดข้อมูลได้ - app.js:50');
      alert('❌ ไม่สามารถเชื่อมต่อ Google Apps Script\n\nกรุณาตรวจสอบ:\n1. Web App URL ถูกต้อง\n2. Deploy แบบ "Anyone" can access');
      reject(new Error('Failed to load API'));
    };
    
    document.body.appendChild(script);
    
    // Timeout หลัง 10 วินาที
    setTimeout(() => {
      if (allData.length === 0) {
        reject(new Error('Timeout'));
      }
    }, 10000);
  });
}

function populateFilters() {
  const universities = [...new Set(allData.map(item => item["มหาวิทยาลัยที่ผ่านการคัดเลือก / เข้าศึกษา"]))];
  const faculties = [...new Set(allData.map(item => item["คณะ"]))];

  const uniSelect = document.getElementById('universityFilter');
  const facSelect = document.getElementById('facultyFilter');

  universities.forEach(uni => {
    if (uni) uniSelect.innerHTML += `<option value="${uni}">${uni}</option>`;
  });

  faculties.forEach(fac => {
    if (fac) facSelect.innerHTML += `<option value="${fac}">${fac}</option>`;
  });
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageData = filteredData.slice(start, end);

  if (pageData.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:3rem; color:#64748b;">
        <p>😔 ไม่พบข้อมูลที่ตรงกับเงื่อนไข</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = pageData.map((item, index) => {
    const globalIndex = start + index;
    
    // 🔥 ดึง PDF URL
    const pdfUrl = item["อัปโหลดตัวอย่างพอร์ตโฟลิโอ (PDF)"];
    
    console.log(`การ์ดที่ ${index + 1}: - app.js:103`, item["ชื่อ - นามสกุล"], '| PDF:', pdfUrl);
    
    let coverHtml = '';
    
    if (pdfUrl && pdfUrl.trim() !== "") {
      const thumbnailUrl = getPdfThumbnailUrl(pdfUrl);
      const fileId = extractFileId(pdfUrl);
      
      if (thumbnailUrl && fileId) {
        // แสดงรูป thumbnail พร้อม fallback เป็น iframe
        coverHtml = `
          <img 
            src="${thumbnailUrl}" 
            alt="Portfolio Preview" 
            class="cover-img"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
          />
          <iframe 
            src="https://drive.google.com/file/d/${fileId}/preview" 
            class="pdf-preview-iframe"
            style="display:none;"
            frameborder="0"
          ></iframe>
        `;
      } else {
        coverHtml = `<div class="placeholder-cover">📄 Portfolio</div>`;
      }
    } else {
      coverHtml = `<div class="placeholder-cover">📄 Portfolio</div>`;
    }

    return `
      <div class="card" onclick="openDetail(${globalIndex})">
        <div class="card-cover">
          ${coverHtml}
        </div>
        <div class="card-body">
          <h3>${item["ชื่อ - นามสกุล"] || "ไม่ระบุชื่อ"}</h3>
          <p><strong>รอบ:</strong> ${item["เข้าศึกษาในรอบไหน"] || "-"}</p>
          <p><strong>คณะ:</strong> ${item["คณะ"] || "-"}</p>
          <p><strong>สาขา:</strong> ${item["สาขา"] || "-"}</p>
          <div class="university-tag">
            🎓 ${item["มหาวิทยาลัยที่ผ่านการคัดเลือก / เข้าศึกษา"] || "-"}
          </div>
        </div>
      </div>
    `;
  }).join('');

  updatePagination();
}

// ==========================================
// แปลง URL เป็น Preview (รองรับหลายรูปแบบ)
// ==========================================
function extractFileId(fileUrl) {
  if (!fileUrl) return null;

  let fileId = "";

  if (fileUrl.includes("open?id=")) {
    fileId = fileUrl.split("open?id=")[1].split("&")[0];
  } else if (fileUrl.includes("/file/d/")) {
    fileId = fileUrl.split("/file/d/")[1].split("/")[0];
  } else if (fileUrl.includes("id=")) {
    fileId = fileUrl.split("id=")[1].split("&")[0];
  }

  return fileId || null;
}

function getPdfThumbnailUrl(fileUrl) {
  const fileId = extractFileId(fileUrl);
  
  if (!fileId) {
    console.warn('⚠️ ไม่สามารถแยก File ID จาก URL: - app.js:179', fileUrl);
    return null;
  }

  console.log('📎 File ID: - app.js:183', fileId);

  // ลอง Thumbnail ก่อน (เร็วกว่า)
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;
}

function updatePagination() {
  const total = filteredData.length;
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, total);
  
  document.getElementById('pageInfo').innerHTML = `
    แสดง ${start}-${end} จาก ${total} รายการ
  `;
}

function openDetail(index) {
  localStorage.setItem("portfolio_list", JSON.stringify(filteredData));
  localStorage.setItem("portfolio_index", index);
  window.location.href = "detail.html";
}

function setupEventListeners() {
  document.getElementById('roundFilter').addEventListener('change', applyFilters);
  document.getElementById('universityFilter').addEventListener('change', applyFilters);
  document.getElementById('facultyFilter').addEventListener('change', applyFilters);
  document.getElementById('resetFilter').addEventListener('click', resetFilters);
}

function applyFilters() {
  const round = document.getElementById('roundFilter').value;
  const university = document.getElementById('universityFilter').value;
  const faculty = document.getElementById('facultyFilter').value;

  filteredData = allData.filter(item => {
    const matchRound = !round || item["เข้าศึกษาในรอบไหน"] === round;
    const matchUni = !university || item["มหาวิทยาลัยที่ผ่านการคัดเลือก / เข้าศึกษา"] === university;
    const matchFac = !faculty || item["คณะ"] === faculty;
    return matchRound && matchUni && matchFac;
  });

  currentPage = 1;
  renderGrid();
}

function resetFilters() {
  document.getElementById('roundFilter').value = "";
  document.getElementById('universityFilter').value = "";
  document.getElementById('facultyFilter').value = "";
  filteredData = [...allData];
  currentPage = 1;
  renderGrid();
}
