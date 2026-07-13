function loadDemo() {
  const aisles = ["D2","E7","E8"], groups = ["BLKA","BLKB","BLKC",""];
  const products = [
    ["N1WB-E27936-BD","HSG ASY FU/TNK FILL PIP"],
    ["N1WB-E22400-D1B5ZJM","HNDL ASY FRT DR O/S"],
    ["-W500223-S442","BOLT M8X20 HF PIL 8"],
    ["N1WB-14A005-AA","WIRING ASY MAIN"]
  ];
  const storage = [], fixed = [], physical = [];
  aisles.forEach((aisle, ai) => {
    for (let stack=1; stack<=12; stack++) for (let level=0; level<=3; level++) {
      const bin = `${aisle}-${String(level).padStart(2,"0")}-${String(stack).padStart(3,"0")}`;
      storage.push({
        "Storage Bin": bin, "Storage Type":"CVPZ", "Storage Section":"VDPT",
        "Empty Storage Bin": (stack + level) % 4 === 0 ? "X":"",
        "Stock Removal Block": stack % 9 === 0 ? "X":"",
        "Putaway Block": stack % 10 === 0 ? "X":"",
        "No. of HUs": (stack + level) % 3,
        "Storage Group": groups[(stack-1) % groups.length],
        "Storage Bin Aisle": aisle, "Storage Bin Level": String(level).padStart(2,"0"), "Storage Bin Stack": String(stack).padStart(3,"0")
      });
      if (level === 1 && stack <= 8) {
        const p = products[(stack + ai) % products.length];
        fixed.push({ "Storage Bin":bin, "Product":p[0], "Product Description":p[1], "Minimum Quantity":100+stack*10, "Maximum Quantity":400+stack*20, "Display UoM Min. Qty":"EA" });
        if (stack % 4 !== 0) {
          physical.push({"Storage Bin":bin,"Handling Unit":`1000000000${ai}${stack}1`,"Product":p[0],"Product Description":p[1],"Quantity":stack*20,"Stock Type":"F1","Storage Type":"CVPZ"});
          if (stack % 3 === 0) physical.push({"Storage Bin":bin,"Handling Unit":`1000000000${ai}${stack}2`,"Product":p[0],"Product Description":p[1],"Quantity":stack*5,"Stock Type":"F1","Storage Type":"CVPZ"});
        }
      }
    }
  });
  ["E7-01-001","E7-01-002","E7-01-003"].forEach((bin,i) => fixed.push({"Storage Bin":bin,"Product":"DEMO-MULTI-001","Product Description":"PIEZA CON PUESTO FIJO MÚLTIPLE","Minimum Quantity":i?0:150,"Maximum Quantity":i?0:600,"Display UoM Min. Qty":"EA"}));
  physical.push({"Storage Bin":"E7-01-001","Handling Unit":"100000000099001","Product":"DEMO-MULTI-001","Product Description":"PIEZA CON PUESTO FIJO MÚLTIPLE","Quantity":220,"Stock Type":"F1","Storage Type":"CVPZ"});
  physical.push({"Storage Bin":"D2-02-011","Handling Unit":"100000000088811","Product":"DEMO-NO-ASIGNADO","Product Description":"STOCK SIN PUESTO FIJO","Quantity":35,"Stock Type":"F1","Storage Type":"CVPZ"});
  state.rawStorage = storage; state.rawPhysical = physical; state.rawFixed = fixed; state.master = buildMaster(storage,fixed,physical); state.filtered=[...state.master]; state.page=1;
  state.storageFileName="Storage Bin DEMO"; state.physicalFileName="Physical Stock DEMO"; state.fixedFileName="Fixed Bin DEMO";
  $("storageFileState").textContent="Storage Bin DEMO cargado"; $("storageFileState").classList.add("ready");
  $("physicalFileState").textContent="Physical Stock DEMO cargado"; $("physicalFileState").classList.add("ready");
  $("fixedFileState").textContent="Fixed Bin DEMO cargado"; $("fixedFileState").classList.add("ready");
  updateImportSummary(); populateAisles(); renderMaster(); renderDashboard(); renderAssignments(); renderRouteSelectors(); renderIntegrity();
  $("importValidation").innerHTML = `<span class="badge-app badge-success">Demo activa</span> Incluye stock real por HU, ubicaciones vacías y diferencias contra la asignación.`;
  toast("Datos de demostración cargados.");
}

function updateImportSummary() {
  $("sumStorage").textContent = `${fmtNumber(state.rawStorage.length)} registros`;
  $("sumPhysical").textContent = `${fmtNumber(state.rawPhysical.length)} registros`;
  $("sumFixed").textContent = `${fmtNumber(state.rawFixed.length)} registros`;
  $("sumAisles").textContent = fmtNumber(uniqueSorted(state.master.map(r => r.aisle)).length);
  $("sumProducts").textContent = fmtNumber(uniqueSorted(state.rawPhysical.map(r => pick(canonicalize(r),"Product"))).length);
}
