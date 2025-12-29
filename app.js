// ✅ ใส่ลิงก์ของคุณให้แล้วครับ
const API_URL = "https://script.google.com/macros/s/AKfycbyfHqGUbF7LMGkBR5bM14LEy1kbm-qenuoywwGUXml9Y9xEPtZijBHGhIaZYd6I-GlqPA/exec";

const ITEMS_PER_PAGE = 15;

let allData = [];
let filteredData = [];
let currentPage = 1;
let isResetting = false;

const grid = document.getElementById("grid");
const pageInfo = document.getElementById("pageInfo");

const roundSelect = document.getElementById("roundFilter");
const universitySelect = document.getElementById("universityFilter");
const facultySelect = document.getElementById("facultyFilter");
const resetBtn = document.getElementById("resetFilter");

/* ===== EVENT LISTENERS ===== */
roundSelect.addEventListener("change", applyFilters);
universitySelect.addEventListener("change", applyFilters);
facultySelect.addEventListener("change", applyFilters);
resetBtn.addEventListener("click", resetFilters);

/* ===== FETCH DATA ===== */
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    allData = data;
    filteredData = [...allData];
    populateFilters();
    render();
  })
  .catch(err => {
    console.error("Error fetching data:", err);
    grid.innerHTML = `<p style="text-align:center;color:red;">โหลดข้อมูลไม่สำเร็จ (กรุณาตรวจสอบ Console)</p>`;
  });

/* ===== THUMBNAIL HELPERS ===== */
function getDriveThumbnail(url) {
  if (!url) return "";
  if (url.includes("open?id=")) {
    const id = url.split("open?id=")[1];
    return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
  }
  if (url.includes("/file/d/")) {
    const id = url.split("/file/d/")[1].split("/")[0];
    return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
  }
  return "";
}

function getYoutubeThumbnail(url) {
  if (!url) return "";
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
}

/* ===== POPULATE FILTER OPTIONS ===== */
function populateFilters() {
  universitySelect.innerHTML = `<option value="">ทุกมหาวิทยาลัย</option>`;
  facultySelect.innerHTML = `<option value="">ทุกคณะ</option>`;

  const universities = [...new Set(allData.map(i => i["มหาวิทยาลัยที่ผ่านการคัดเลือก / เข้าศึกษา"]).filter(Boolean))];
  const faculties = [...new Set(allData.map(i => i["คณะ"]).filter(Boolean))];

  universities.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    universitySelect.appendChild(opt);
  });

  faculties.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    facultySelect.appendChild(opt);
  });
}

/* ===== APPLY FILTERS ===== */
function applyFilters() {
  if (isResetting) return;
  const round = roundSelect.value;
  const university = universitySelect.value;
  const faculty = facultySelect.value;

  filteredData = allData.filter(item => {
    if (round && item["เข้าศึกษาในรอบไหน"] !== round) return false;
    if (university && item["มหาวิทยาลัยที่ผ่านการคัดเลือก / เข้าศึกษา"] !== university) return false;
    if (faculty && item["คณะ"] !== faculty) return false;
    return true;
  });

  currentPage = 1;
  render();
}

/* ===== RESET FILTERS ===== */
function resetFilters() {
  isResetting = true;
  roundSelect.selectedIndex = 0;
  universitySelect.selectedIndex = 0;
  facultySelect.selectedIndex = 0;
  filteredData = [...allData];
  currentPage = 1;
  render();
  isResetting = false;
}

/* ===== RENDER GRID ===== */
function render() {
  grid.innerHTML = "";
  if (filteredData.length === 0) {
    grid.innerHTML = `<p style="text-align:center;color:#64748b;grid-column:1/-1;">ไม่พบพอร์ตที่ค้นหา</p>`;
    pageInfo.textContent = "หน้า 0 / 0";
    return;
  }

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredData.slice(start, start + ITEMS_PER_PAGE);

  pageItems.forEach((item, i) => {
    let coverHTML = "";
    let hasCover = false;

    if (item["เข้าศึกษาในรอบไหน"] === "Portfolio" && item["อัปโหลดตัวอย่างพอร์ตโฟลิโอ (PDF)"]) {
      hasCover = true;
      coverHTML = `<img src="${getDriveThumbnail(item["อัปโหลดตัวอย่างพอร์ตโฟลิโอ (PDF)"])}" class="cover-img" alt="หน้าปกพอร์ต">`;
    } else if (item["เข้าศึกษาในรอบไหน"] === "Admission" && item["วิดีโอแนะนำรอบ Admission (ถ้ามี)"]) {
      hasCover = true;
      coverHTML = `<img src="${getYoutubeThumbnail(item["วิดีโอแนะนำรอบ Admission (ถ้ามี)"])}" class="cover-img" alt="หน้าปกวิดีโอ">`;
    }
    
    if (!hasCover) {
      coverHTML = `<div class="cover-placeholder"><span>ไม่มีหน้าปก</span></div>`;
    }

    grid.innerHTML += `
      <div class="card" onclick="goDetail(${start + i})">
        <div class="card-cover">${coverHTML}</div>
        <div class="card-body">
          <h3>${item["ชื่อ - นามสกุล"] || "-"}</h3>
          ${item["คณะ"] ? `<p>${item["คณะ"]}</p>` : ""}
          ${item["สาขา"] ? `<p>${item["สาขา"]}</p>` : ""}
          ${item["มหาวิทยาลัยที่ผ่านการคัดเลือก / เข้าศึกษา"] ? 
            `<div class="university-tag">${item["มหาวิทยาลัยที่ผ่านการคัดเลือก / เข้าศึกษา"]}</div>` : ""}
        </div>
      </div>
    `;
  });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  pageInfo.textContent = `หน้า ${currentPage} / ${totalPages}`;
}

/* ===== DETAIL NAV ===== */
function goDetail(index) {
  localStorage.setItem("portfolio_detail", JSON.stringify(filteredData[index]));
  localStorage.setItem("portfolio_list", JSON.stringify(filteredData));
  localStorage.setItem("portfolio_index", index);
  window.location.href = "detail.html";
}