import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyApb7A9mFmj1gq1poLS0vQxTWz2__CULGA",
  authDomain: "sera-business-hub.firebaseapp.com",
  projectId: "sera-business-hub",
  storageBucket: "sera-business-hub.firebasestorage.app",
  messagingSenderId: "323062656725",
  appId: "1:323062656725:web:35a2ae4ed6d4e9f6ed7c5c",
  measurementId: "G-54S5JPSCTP"
};

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app), provider=new GoogleAuthProvider();
let currentUser=null, productsData=[], salesData=[], unsubscribeProducts=null, unsubscribeSales=null, unsubscribeDue=null, unsubscribeBkash=null, unsubscribeNagad=null;
const $=id=>document.getElementById(id);
const loginBtn=$("login-btn"),logoutBtn=$("logout-btn"),userProfile=$("user-profile"),userName=$("user-name"),userPhoto=$("user-photo");
const modal=$("modal"),addBtn=$("add-btn"),closeModalBtn=$("close-modal"),form=$("add-product-form"),tableBody=$("product-tbody"),downloadPdfBtn=$("download-pdf-btn");

loginBtn.addEventListener("click",async()=>{try{await signInWithPopup(auth,provider)}catch(e){alert("লগইন করা যায়নি: "+e.message)}});
logoutBtn.addEventListener("click",()=>signOut(auth));

onAuthStateChanged(auth,user=>{
  currentUser=user;
  if(user){
    loginBtn.style.display="none"; userProfile.style.display="flex"; userName.textContent=user.displayName||user.email||"ইউজার"; userPhoto.src=user.photoURL||"https://via.placeholder.com/35";
    loadUserData(); loadAllModules(); loadSettings();
  }else{
    loginBtn.style.display="block"; userProfile.style.display="none"; tableBody.innerHTML='<tr><td colspan="7" class="center">তথ্য দেখতে অনুগ্রহ করে লগইন করুন।</td></tr>';
    clearModuleListeners();
  }
});

function requireLogin(){if(!currentUser){alert("এই অংশ ব্যবহার করতে আগে Gmail দিয়ে লগইন করুন!");return false}return true}
function convertBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}

addBtn.onclick=()=>{if(requireLogin())modal.style.display="flex"};
document.querySelectorAll(".open-add").forEach(b=>b.onclick=()=>{if(requireLogin())modal.style.display="flex"});
closeModalBtn.onclick=()=>modal.style.display="none";
window.addEventListener("click",e=>{if(e.target===modal)modal.style.display="none"});

form.addEventListener("submit",async e=>{
 e.preventDefault(); if(!requireLogin())return;
 const file=$("p-image").files[0]; let img="";
 if(file)img=await convertBase64(file);
 try{
  await addDoc(collection(db,"products"),{uid:currentUser.uid,name:$("p-name").value.trim(),category:$("p-category").value.trim(),stock:+$("p-stock").value||0,buyPrice:+$("p-buy-price").value||0,sellPrice:+$("p-sell-price").value||0,img,createdAt:new Date().toISOString()});
  form.reset();modal.style.display="none";
 }catch(e){alert("ডাটা সেভ করতে সমস্যা হয়েছে: "+e.message)}
});

function loadUserData(){
 const qp=query(collection(db,"products"),where("uid","==",currentUser.uid));
 if(unsubscribeProducts)unsubscribeProducts();
 unsubscribeProducts=onSnapshot(qp,snap=>{
  productsData=snap.docs.map(d=>({id:d.id,...d.data()}));
  renderDashboardTable(productsData); renderProductPages(); updateCategoryPages(); renderTotals();
 });
 const qs=query(collection(db,"sales"),where("uid","==",currentUser.uid));
 if(unsubscribeSales)unsubscribeSales();
 unsubscribeSales=onSnapshot(qs,snap=>{
  salesData=snap.docs.map(d=>d.data());
  let ms=0,mp=0; snap.forEach(d=>{const s=d.data();ms+=+s.sellPrice||0;mp+=+s.profit||0});
  $("total-sales-val").textContent="৳"+ms;$("total-profit-val").textContent="৳"+mp;
 });
}
function renderDashboardTable(list){
 tableBody.innerHTML="";
 if(!list.length){tableBody.innerHTML='<tr><td colspan="7" class="center">কোনো পণ্য নেই।</td></tr>';return}
 list.slice(0,20).forEach(p=>tableBody.appendChild(productRow(p)));
}
function productRow(p){
 const tr=document.createElement("tr");
 tr.innerHTML=`<td>${p.img?`<img src="${p.img}" class="product-img">`:"<i class='fa-solid fa-image'></i>"}</td>
 <td><strong>${escapeHtml(p.name)}</strong></td><td>${escapeHtml(p.category)}</td><td>${p.stock}</td><td>৳${p.buyPrice}</td><td>৳${p.sellPrice}</td>
 <td><button class="small-btn success sell-btn" data-id="${p.id}">বিক্রি</button> <button class="small-btn danger del-btn" data-id="${p.id}">ডিলিট</button></td>`;
 return tr;
}
function renderTotals(){
 let stock=0,buy=0,sell=0;productsData.forEach(p=>{stock+=+p.stock||0;buy=(+p.buyPrice||0)*(+p.stock||0)+buy;sell=(+p.sellPrice||0)*(+p.stock||0)+sell});
 $("total-stock").innerHTML=`<strong>${stock}</strong>`;$("total-buy-price").innerHTML=`<strong>৳${buy}</strong>`;$("total-sell-price").innerHTML=`<strong>৳${sell}</strong>`;
}
tableBody.addEventListener("click",async e=>{
 const id=e.target.dataset.id;if(!id||!requireLogin())return;const p=productsData.find(x=>x.id===id);if(!p)return;
 try{
  if(e.target.classList.contains("sell-btn")){if((+p.stock||0)<=0)return alert("স্টক শেষ!");await updateDoc(doc(db,"products",id),{stock:(+p.stock||0)-1});await addDoc(collection(db,"sales"),{uid:currentUser.uid,productId:id,productName:p.name,buyPrice:p.buyPrice,sellPrice:p.sellPrice,profit:(+p.sellPrice||0)-(+p.buyPrice||0),date:new Date().toISOString()})}
  if(e.target.classList.contains("del-btn")&&confirm("পণ্যটি ডিলিট করতে চান?"))await deleteDoc(doc(db,"products",id));
 }catch(err){alert("কাজটি সম্পন্ন হয়নি: "+err.message)}
});

function renderProductPages(){
 renderCards("all-products",productsData);
 const q=productsData.filter(p=>/electronics|ইলেকট্রনিক্স|electronic|টিভি|মোবাইল|ফ্রিজ|ইলেকট্রিক/i.test(p.category+" "+p.name));
 renderCards("electronics-products",q);
}
function renderCards(id,list){
 const box=$(id);if(!box)return;
 if(!list.length){box.innerHTML='<p class="center">কোনো তথ্য পাওয়া যায়নি।</p>';return}
 box.innerHTML=`<table class="data-table"><thead><tr><th>ছবি</th><th>নাম</th><th>ক্যাটাগরি</th><th>স্টক</th><th>ক্রয়</th><th>বিক্রয়</th><th>অ্যাকশন</th></tr></thead><tbody></tbody></table>`;
 const tb=box.querySelector("tbody");list.forEach(p=>tb.appendChild(productRow(p)));
}
function updateCategoryPages(){renderProductPages()}

function clearModuleListeners(){
 [unsubscribeProducts,unsubscribeSales,unsubscribeDue,unsubscribeBkash,unsubscribeNagad].forEach(u=>{if(u)u()});
 unsubscribeProducts=unsubscribeSales=unsubscribeDue=unsubscribeBkash=unsubscribeNagad=null;
}

async function saveCollection(name,data){if(!requireLogin())return;try{await addDoc(collection(db,name),{...data,uid:currentUser.uid,createdAt:new Date().toISOString()})}catch(e){alert("সেভ করা যায়নি: "+e.message)}}

$("computer-form").addEventListener("submit",e=>{e.preventDefault();saveCollection("computerServices",{name:$("cs-name").value,phone:cleanPhone($("cs-phone").value),details:$("cs-details").value,price:+$("cs-price").value||0}).then(()=>e.target.reset())});
$("school-form").addEventListener("submit",e=>{e.preventDefault();saveCollection("schoolStudents",{name:$("student-name").value,phone:cleanPhone($("student-phone").value),className:$("student-class").value,fee:+$("student-fee").value||0}).then(()=>e.target.reset())});
$("print-form").addEventListener("submit",e=>{e.preventDefault();saveCollection("printOrders",{name:$("print-name").value,phone:cleanPhone($("print-phone").value),type:$("print-type").value,qty:+$("print-qty").value||1,price:+$("print-price").value||0}).then(()=>e.target.reset())});

$("bkash-form").addEventListener("submit",e=>{e.preventDefault();saveCollection("bkashTransactions",{name:$("bkash-name").value,phone:cleanPhone($("bkash-phone").value),type:$("bkash-type").value,amount:+$("bkash-amount").value||0,note:$("bkash-note").value}).then(()=>e.target.reset())});
$("nagad-form").addEventListener("submit",e=>{e.preventDefault();saveCollection("nagadTransactions",{name:$("nagad-name").value,phone:cleanPhone($("nagad-phone").value),type:$("nagad-type").value,amount:+$("nagad-amount").value||0,note:$("nagad-note").value}).then(()=>e.target.reset())});
$("due-form").addEventListener("submit",e=>{e.preventDefault();saveCollection("dueLedger",{name:$("due-name").value,phone:cleanPhone($("due-phone").value),amount:+$("due-amount").value||0,status:$("due-status").value,note:$("due-note").value}).then(()=>e.target.reset())});

function loadAllModules(){
 listenAndRender("computerServices","computer-list",["name","phone","details","price"]);
 listenAndRender("schoolStudents","school-list",["name","phone","className","fee"]);
 listenAndRender("printOrders","print-list",["name","phone","type","qty","price"]);
 if(unsubscribeBkash)unsubscribeBkash(); if(unsubscribeNagad)unsubscribeNagad(); if(unsubscribeDue)unsubscribeDue();
 const qB=query(collection(db,"bkashTransactions"),where("uid","==",currentUser.uid));unsubscribeBkash=onSnapshot(qB,s=>{const a=s.docs.map(d=>({id:d.id,...d.data()}));renderAgent("bkash-list",a,"bkashTransactions");});
 const qN=query(collection(db,"nagadTransactions"),where("uid","==",currentUser.uid));unsubscribeNagad=onSnapshot(qN,s=>{const a=s.docs.map(d=>({id:d.id,...d.data()}));renderAgent("nagad-list",a,"nagadTransactions");});
 const qD=query(collection(db,"dueLedger"),where("uid","==",currentUser.uid));unsubscribeDue=onSnapshot(qD,s=>{const a=s.docs.map(d=>({id:d.id,...d.data()}));renderDue(a);let total=a.filter(x=>x.status!=="paid").reduce((n,x)=>n+(+x.amount||0),0);$("total-due-val").textContent="৳"+total;});
}
function listenAndRender(coll,id,fields){
 const q=query(collection(db,coll),where("uid","==",currentUser.uid));onSnapshot(q,s=>renderGeneric(id,s.docs.map(d=>({id:d.id,...d.data()})),coll,fields));
}
function renderGeneric(id,a,coll,fields){
 const box=$(id);if(!a.length){box.innerHTML='<p class="center">কোনো তথ্য নেই।</p>';return}
 box.innerHTML=`<table class="data-table"><thead><tr>${fields.map(f=>`<th>${label(f)}</th>`).join("")}<th>অ্যাকশন</th></tr></thead><tbody>${a.map(x=>`<tr>${fields.map(f=>`<td>${escapeHtml(x[f]??"")}</td>`).join("")}<td><button class="small-btn danger" data-coll="${coll}" data-id="${x.id}">ডিলিট</button></td></tr>`).join("")}</tbody></table>`;
}
function renderAgent(id,a,coll){
 const box=$(id);if(!a.length){box.innerHTML='<p class="center">কোনো লেনদেন নেই।</p>';return}
 box.innerHTML=`<table class="data-table"><thead><tr><th>তারিখ</th><th>নাম</th><th>নম্বর</th><th>ধরন</th><th>টাকা</th><th>নোট</th><th></th></tr></thead><tbody>${a.sort((x,y)=>String(y.createdAt).localeCompare(String(x.createdAt))).map(x=>`<tr><td>${formatDate(x.createdAt)}</td><td>${escapeHtml(x.name||"")}</td><td>${escapeHtml(x.phone||"")}</td><td>${escapeHtml(x.type||"")}</td><td>৳${x.amount||0}</td><td>${escapeHtml(x.note||"")}</td><td><button class="small-btn danger" data-coll="${coll}" data-id="${x.id}">ডিলিট</button></td></tr>`).join("")}</tbody></table>`;
}
function renderDue(a){
 const box=$("due-list");if(!a.length){box.innerHTML='<p class="center">কোনো বাকি নেই।</p>';return}
 box.innerHTML=`<table class="data-table"><thead><tr><th>নাম</th><th>নম্বর</th><th>টাকা</th><th>স্ট্যাটাস</th><th>নোট</th><th></th></tr></thead><tbody>${a.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.phone)}</td><td>৳${x.amount||0}</td><td>${x.status==="paid"?"পরিশোধ":"বাকি"}</td><td>${escapeHtml(x.note||"")}</td><td><button class="small-btn danger" data-coll="dueLedger" data-id="${x.id}">ডিলিট</button></td></tr>`).join("")}</tbody></table>`;
}
document.addEventListener("click",async e=>{if(e.target.matches(".small-btn.danger")&&e.target.dataset.coll){if(confirm("ডাটা ডিলিট করবেন?"))try{await deleteDoc(doc(db,e.target.dataset.coll,e.target.dataset.id))}catch(err){alert(err.message)}}});

function label(x){return({name:"নাম",phone:"মোবাইল",details:"বিবরণ",price:"মূল্য",className:"শ্রেণি",fee:"ফি",type:"ধরন",qty:"পরিমাণ"}[x]||x)}
function cleanPhone(v){return v.replace(/[^\d+]/g,"")}
function formatDate(v){try{return new Date(v).toLocaleString("bn-BD")}catch{return v||""}}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

$("settings-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!requireLogin())return;
 await saveCollection("businessSettings",{businessName:$("business-name").value,businessPhone:cleanPhone($("business-phone").value),businessAddress:$("business-address").value});
 $("settings-status").textContent="সেটিং সফলভাবে সেভ হয়েছে।";
});
async function loadSettings(){
 const q=query(collection(db,"businessSettings"),where("uid","==",currentUser.uid));const s=await getDocs(q);
 if(!s.empty){const x=s.docs[0].data();$("business-name").value=x.businessName||"";$("business-phone").value=x.businessPhone||"";$("business-address").value=x.businessAddress||""}
 $("settings-status").textContent="লগইন করা ইউজারের ডাটা আলাদা Firebase account-এ সংরক্ষিত হচ্ছে।";
}

document.querySelectorAll(".nav-item").forEach(item=>item.addEventListener("click",e=>{e.preventDefault();showPage(item.dataset.page)}));
function showPage(page){
 document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 const p=$("page-"+page);if(p)p.classList.add("active");
}
showPage("dashboard");

$("search-input").addEventListener("input",e=>{
 const q=e.target.value.toLowerCase().trim();if(!q){renderDashboardTable(productsData);return}
 renderDashboardTable(productsData.filter(p=>(p.name+" "+p.category).toLowerCase().includes(q)));
});

downloadPdfBtn.addEventListener("click",()=>{
 if(!requireLogin())return;const {jsPDF}=window.jspdf, pdf=new jsPDF();
 pdf.setFontSize(18);pdf.text("Sera Business Hub - Monthly Sales Report",14,20);
 pdf.setFontSize(11);pdf.text(`User Name: ${currentUser.displayName||currentUser.email}`,14,28);pdf.text(`Report Date: ${new Date().toLocaleDateString()}`,14,34);
 let totalSales=0,totalProfit=0;const rows=salesData.map((s,i)=>{totalSales+=+s.sellPrice||0;totalProfit+=+s.profit||0;return[i+1,s.productName,new Date(s.date).toLocaleDateString(),`Tk ${s.buyPrice}`,`Tk ${s.sellPrice}`,`Tk ${s.profit}`]});
 pdf.autoTable({startY:40,head:[["#","Product Name","Date","Buy Price","Sell Price","Profit"]],body:rows});
 const y=pdf.lastAutoTable?.finalY||50;pdf.text(`Total Sales Amount: Tk ${totalSales}`,14,y+10);pdf.text(`Total Profit Amount: Tk ${totalProfit}`,14,y+17);
 pdf.save(`Monthly_Report_${new Date().getMonth()+1}_${new Date().getFullYear()}.pdf`);
});
