import { calculatePrintEstimate } from "./printing-core.mjs";
const threeModule = import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js")
  .catch(error => {
    console.warn("MTDM 3D preview library unavailable; estimator remains usable.", error);
    return null;
  });

const $ = (id) => document.getElementById(id);
const host = $("print3dView");
if (host) {
  threeModule.then(THREE => {
    if (!THREE) {
      $("print3dStatus").textContent = "3D PREVIEW UNAVAILABLE";
      host.textContent = "Interactive 3D preview requires WebGL and access to the Three.js CDN. The process and cost estimator remains available.";
      return;
    }
    try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#091321");
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
  camera.position.set(95, 85, 115);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xdceeff, 0x24334a, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(70, 100, 80); scene.add(key);
  const grid = new THREE.GridHelper(150, 15, 0x42617e, 0x263b52); grid.position.y = -0.1; scene.add(grid);
  const axes = new THREE.AxesHelper(35); scene.add(axes);
  const part = new THREE.Group(); scene.add(part);
  let shape = "cube", dragging = false, lastX = 0, lastY = 0;
  let radius = 130, theta = Math.PI / 4, phi = Math.PI / 3, cameraTargetY = 20;
  const updateCamera = () => {
    phi = Math.max(0.18, Math.min(Math.PI - 0.18, phi));
    camera.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
    camera.lookAt(0, cameraTargetY, 0);
  };
  shape = document.querySelector("[data-print-shape].active")?.dataset.printShape || "cube";
  function rebuild() {
    while (part.children.length) {
      const obj = part.children.pop();
      obj.geometry?.dispose();
      if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
    }
    const mat = new THREE.MeshStandardMaterial({ color: 0x42c8b6, roughness: 0.48, metalness: 0.12 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xb9fff4 });
    const x = Number($("printX").value), y = Number($("printY").value), z = Number($("printZ").value);
    cameraTargetY = Number.isFinite(z) ? z / 2 : 15;
    radius = Math.max(130, (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? Math.max(x, y, z) : 50) * 2.6);
    updateCamera();
    const addMesh = (geometry, position, scale = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      part.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMat);
      edges.position.copy(mesh.position); edges.scale.copy(mesh.scale); part.add(edges);
    };
    if (shape === "cube") addMesh(new THREE.BoxGeometry(x, z, y), [0, z / 2, 0]);
    if (shape === "cylinder") addMesh(new THREE.CylinderGeometry(1, 1, 1, 48), [0, z / 2, 0], [x / 2, z, y / 2]);
    if (shape === "bracket") {
      const wall = Math.min(8, Math.max(2, Math.min(x, y) * 0.1));
      addMesh(new THREE.BoxGeometry(wall, z, y), [-x / 2 + wall / 2, z / 2, 0]);
      addMesh(new THREE.BoxGeometry(x, z, wall), [0, z / 2, -y / 2 + wall / 2]);
    }
    $("print3dStatus").textContent = "3D PREVIEW READY";
  }
  function resize() { const w = host.clientWidth || 600, h = host.clientHeight || 390; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  host.addEventListener("pointerdown", e => {dragging=true;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId);});
  host.addEventListener("pointermove", e => {if(!dragging)return;theta-=(e.clientX-lastX)*0.008;phi+=(e.clientY-lastY)*0.008;lastX=e.clientX;lastY=e.clientY;updateCamera();});
  host.addEventListener("pointerup",()=>dragging=false);host.addEventListener("pointercancel",()=>dragging=false);
  host.addEventListener("wheel",e=>{e.preventDefault();radius=Math.max(65,Math.min(1200,radius+e.deltaY*0.12));updateCamera();},{passive:false});
  document.querySelectorAll("[data-print-shape]").forEach(btn=>btn.addEventListener("click",()=>{shape=btn.dataset.printShape;document.querySelectorAll("[data-print-shape]").forEach(b=>b.classList.toggle("active",b===btn));rebuild();}));
  ["printX","printY","printZ"].forEach(id => $(id).addEventListener("change", rebuild));
  updateCamera();resize();rebuild();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host); else window.addEventListener("resize",resize);
  renderer.setAnimationLoop(()=>renderer.render(scene,camera));
    } catch (error) {
      $("print3dStatus").textContent = "3D PREVIEW UNAVAILABLE";
      host.textContent = "Interactive 3D preview is unavailable in this browser. The process and cost estimator remains available.";
      console.warn("MTDM 3D preview initialization failed; estimator remains usable.", error);
    }
  });
}

const processData = {
  fdm:{rate:18,factor:1.22,setup:8,materials:["pla","petg","abs","nylon","tpu"]},
  sla:{rate:12,factor:1.15,setup:18,materials:["resin"]},dlp:{rate:25,factor:1.12,setup:14,materials:["resin"]},msla:{rate:22,factor:1.14,setup:15,materials:["resin"]},
  sls:{rate:28,factor:1.35,setup:35,materials:["nylon"]},mjf:{rate:38,factor:1.3,setup:40,materials:["nylon"]},
  slm:{rate:3.2,factor:2.1,setup:95,materials:["aluminum","steel","titanium"]},ebm:{rate:4.5,factor:2.2,setup:110,materials:["titanium"]},
  binder:{rate:22,factor:1.8,setup:45,materials:["steel"]},materialjet:{rate:9,factor:1.35,setup:25,materials:["resin"]},
  ded:{rate:7,factor:1.8,setup:80,materials:["steel","titanium"]},waam:{rate:14,factor:1.7,setup:90,materials:["steel","aluminum"]},
  sheet:{rate:30,factor:1.3,setup:30,materials:["abs"]},pellet:{rate:65,factor:1.35,setup:25,materials:["pla","abs"]},
  concrete:{rate:45,factor:1.5,setup:60,materials:["concrete"]}
};
const density={pla:1.24,petg:1.27,abs:1.04,nylon:1.01,resin:1.1,tpu:1.2,aluminum:2.7,steel:8,titanium:4.43,concrete:2.2};
function estimate(){
  const processId=$("printProcess").value;
  if(processId==="bio")throw new Error("Bioprinting is a research overview only; no estimate is provided.");
  const p=processData[processId],mat=$("printMaterial").value;
  if(!p||!p.materials.includes(mat))throw new Error("Selected feedstock is not a representative match for this process. Choose a compatible material.");
  const shape=document.querySelector("[data-print-shape].active")?.dataset.printShape||"cube";
  const result=calculatePrintEstimate({
    shape,
    x:$("printX").value,y:$("printY").value,z:$("printZ").value,
    layerHeight:$("printLayer").value,infill:$("printInfill").value,speed:$("printSpeed").value,
    pricePerKg:$("printPrice").value,powerKw:$("printPower").value,electricityRate:$("printRate").value,
    process:processId,processModel:p,materialDensity:density[mat]
  });
  $("printVolume").textContent=result.volumeCm3.toFixed(2)+" cm³";
  $("printMass").textContent=result.materialGrams.toFixed(2)+" g";
  $("printTime").textContent=result.durationHours<1?(result.durationHours*60).toFixed(1)+" min":result.durationHours.toFixed(2)+" h";
  $("printCost").textContent="$"+result.totalCost.toFixed(2);
  $("printLayers").textContent=result.layers.toLocaleString();
  $("printEstimateStatus").textContent="ESTIMATE READY";
  $("printEstimateLog").textContent=[
    "PROCESS: "+$("printProcess").selectedOptions[0].text,
    "GEOMETRY: "+result.description,
    "ENVELOPE: "+result.dimensions.x+" × "+result.dimensions.y+" × "+result.dimensions.z+" mm",
    "GEOMETRIC VOLUME: "+result.volumeCm3.toFixed(2)+" cm³",
    "MATERIAL: "+$("printMaterial").selectedOptions[0].text,
    "ESTIMATED FEEDSTOCK: "+result.materialGrams.toFixed(2)+" g (includes process factor)",
    "MATERIAL FRACTION: "+(result.materialFraction*100).toFixed(1)+"%"+(result.infillApplied?" (18% shell allowance + selected infill)":" (infill input ignored for this process family)"),
    "ESTIMATED BUILD DURATION: "+(result.durationHours*60).toFixed(1)+" min",
    "THROUGHPUT: "+result.effectiveRate.toFixed(2)+" cm³/h",
    "THROUGHPUT MODEL: "+result.rateExplanation,
    "ESTIMATED ENERGY: "+result.energyKwh.toFixed(3)+" kWh",
    "MATERIAL COST: $"+result.materialCost.toFixed(2)+" · ENERGY COST: $"+result.energyCost.toFixed(2),
    "",
    "MODEL LIMITATIONS:",
    "• Geometry is an idealized envelope; no CAD mesh, wall topology, holes, supports or true slicer toolpath.",
    "• FDM/pellet use a simplified shell allowance and volumetric-flow bound; actual flow, acceleration and travel vary by machine.",
    "• Other process rates and setup allowances are illustrative defaults, not vendor-validated machine data.",
    "• Layer count is a geometric planning indicator; non-extrusion process layer strategies are machine-specific.",
    "• Waste, purge, nesting, thermal distortion, post-processing, failure risk and labour are not fully modelled.",
    "• Industrial metal, concrete and bio-process estimates require qualified, machine- and facility-specific validation.",
    "Do not use these values for quotations, structural release or machine operation."
  ].join("\n");
}
$("printEstimate").addEventListener("click",()=>{try{estimate()}catch(e){$("printEstimateStatus").textContent="CHECK INPUT";$("printEstimateLog").textContent="INPUT / PROCESS ERROR\n"+e.message}});
$("printReset").addEventListener("click",()=>{$("printProcess").value="fdm";syncProcessControls();$("printMaterial").value="pla";$("printX").value=40;$("printY").value=40;$("printZ").value=30;$("printLayer").value=0.2;$("printInfill").value=20;$("printSpeed").value=50;$("printPrice").value=22;$("printPower").value=0.12;$("printRate").value=0.15;document.querySelector('[data-print-shape="cube"]')?.click();$("printEstimateStatus").textContent="NOT CALCULATED";$("printEstimateLog").textContent="Parameters reset. Calculate a new estimate."; });
function syncProcessControls(){const processId=$("printProcess").value;const extrusion=["fdm","pellet"].includes(processId);const researchOnly=processId==="bio";$("printSpeed").disabled=!extrusion;$("printInfill").disabled=!extrusion;$("printEstimate").disabled=researchOnly;if(researchOnly){$("printEstimateStatus").textContent="RESEARCH OVERVIEW ONLY";$("printEstimateLog").textContent="Bioprinting is presented for high-level research awareness only. This lab does not model biological feedstocks, cells, sterility, viability, medical use or bioprinting process parameters; no estimate is provided.";}else if($("printEstimateStatus").textContent==="RESEARCH OVERVIEW ONLY"){$("printEstimateStatus").textContent="NOT CALCULATED";$("printEstimateLog").textContent="Select a process and calculate an estimate. Values are planning approximations, not a machine quote.";}}
syncProcessControls();
$("printProcess").addEventListener("change",()=>{const map={fdm:"pla",sla:"resin",dlp:"resin",msla:"resin",sls:"nylon",mjf:"nylon",slm:"aluminum",ebm:"titanium",binder:"steel",materialjet:"resin",ded:"steel",waam:"steel",sheet:"abs",pellet:"pla",concrete:"concrete"};$("printMaterial").value=map[$("printProcess").value];syncProcessControls();});
