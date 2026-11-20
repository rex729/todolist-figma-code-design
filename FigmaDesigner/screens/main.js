/**
 * Screen: Main
 * ⚠️ 修改本檔後，請務必執行 `sh FigmaDesigner/build_plugin.sh` 同步更新 Figma Plugin。
 *
 * 負責建構 `Main` Page (`Main Screen` 393×852)：
 * - `TopNavBar`：左側 `NavTitle` ("My Todo List") + 右側 `AddButton` ("+ Add")
 * - `ListView`：垂直自動佈局，內嵌 3 筆不同狀態 (`TODO` / `IN PROGRESS` / `DONE`) 的 `◇ ToDoCellItem` Instances
 * - 底部配置 `LogOut` 按鈕（`◇ AppButton` `Style=Secondary` Instance，文字 `"LogOut"`，底部間距 `spacing/3xl`）
 */
(async () => {
  const ctx = await createFigmaDesignerContext();

  // 從 Components Page 取得 ToDoCellItem 與 AppButton 母體與屬性定義
  const compPage = figma.root.children.find(p => p.name === 'Components');
  if (!compPage) throw new Error('Components page not found. Please run Components first!');
  await compPage.loadAsync();

  const todoSet = compPage.children.find(n => n.type === 'COMPONENT_SET' && n.name === 'ToDoCellItem');
  if (!todoSet) throw new Error('ToDoCellItem not found on the Components page!');

  const appButtonSet = compPage.children.find(n => n.type === 'COMPONENT_SET' && n.name === 'AppButton');
  if (!appButtonSet) throw new Error('AppButton not found on the Components page!');
  const secondaryBtnVariant = appButtonSet.children.find(c => c.name === 'Style=Secondary') || appButtonSet.children[0];
  const btnLabelPropKey = Object.keys(appButtonSet.componentPropertyDefinitions || {}).find(k => k.startsWith('Label'));

  const propDefs = todoSet.componentPropertyDefinitions;
  const titlePropKey = Object.keys(propDefs).find(k => k.startsWith('Title'));
  const duePropKey = Object.keys(propDefs).find(k => k.startsWith('Due Date'));

  const todoVariant = todoSet.children.find(c => c.name === 'Status=TODO') || todoSet.children[0];
  const inProgressVariant = todoSet.children.find(c => c.name === 'Status=IN PROGRESS') || todoSet.children[1] || todoSet.children[0];
  const doneVariant = todoSet.children.find(c => c.name === 'Status=DONE') || todoSet.children[2] || todoSet.children[0];

  // 切換至 Main Page（不存在則自動建立）
  const mainPage = await ctx.getOrCreatePage('Main', ['主畫面']);

  // 徹底刪除既有的 Main Screen、重複畫布或空白 Frame
  for (const child of [...mainPage.children]) {
    if (
      child.name === 'Main Screen' ||
      child.name === 'TopNavBar' ||
      child.name === 'ListView' ||
      (child.type === 'FRAME' && child.children.length === 0)
    ) {
      child.remove();
    }
  }

  const mainScreen = figma.createFrame();
  mainScreen.name = 'Main Screen';
  mainScreen.resize(393, 852);
  mainScreen.layoutMode = 'VERTICAL';
  mainScreen.primaryAxisSizingMode = 'FIXED';
  mainScreen.counterAxisSizingMode = 'FIXED';
  ctx.bindFill(mainScreen, 'light/bg/canvas', { r: 0.96, g: 0.97, b: 0.98 });
  ctx.bindFloat(mainScreen, 'paddingLeft', 'spacing/lg', 16);
  ctx.bindFloat(mainScreen, 'paddingRight', 'spacing/lg', 16);
  ctx.bindFloat(mainScreen, 'paddingTop', 'spacing/4xl', 48);
  ctx.bindFloat(mainScreen, 'paddingBottom', 'spacing/3xl', 32);
  ctx.bindFloat(mainScreen, 'itemSpacing', 'spacing/xl', 20);

  // 頂部導覽列 TopNavBar
  const topNav = figma.createFrame();
  topNav.name = 'TopNavBar';
  topNav.layoutMode = 'HORIZONTAL';
  topNav.primaryAxisSizingMode = 'FIXED';
  topNav.counterAxisSizingMode = 'AUTO';
  topNav.primaryAxisAlignItems = 'SPACE_BETWEEN';
  topNav.counterAxisAlignItems = 'CENTER';
  topNav.fills = [];
  mainScreen.appendChild(topNav);
  topNav.layoutSizingHorizontal = 'FILL';
  topNav.layoutSizingVertical = 'HUG';

  const navTitle = figma.createText();
  navTitle.name = 'NavTitle';
  navTitle.fontName = { family: 'Inter', style: 'Bold' };
  navTitle.fontSize = 24;
  navTitle.characters = 'My Todo List';
  await ctx.applyTextStyle(navTitle, 'Heading/H1');
  ctx.bindFill(navTitle, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
  topNav.appendChild(navTitle);
  navTitle.layoutSizingHorizontal = 'HUG';

  const addBtn = figma.createFrame();
  addBtn.name = 'AddButton';
  addBtn.layoutMode = 'HORIZONTAL';
  addBtn.primaryAxisSizingMode = 'AUTO';
  addBtn.counterAxisSizingMode = 'FIXED';
  addBtn.primaryAxisAlignItems = 'CENTER';
  addBtn.counterAxisAlignItems = 'CENTER';
  topNav.appendChild(addBtn);
  addBtn.resize(76, 36);
  addBtn.layoutSizingHorizontal = 'HUG';
  addBtn.layoutSizingVertical = 'FIXED';
  ctx.bindFloat(addBtn, 'height', 'size/control-sm', 36);
  ctx.bindFill(addBtn, 'light/brand/primary', { r: 0, g: 0.4, b: 1 });
  ctx.bindFloat(addBtn, 'paddingLeft', 'spacing/md', 12);
  ctx.bindFloat(addBtn, 'paddingRight', 'spacing/md', 12);
  ctx.bindFloat(addBtn, 'topLeftRadius', 'radius/sm', 8);
  ctx.bindFloat(addBtn, 'topRightRadius', 'radius/sm', 8);
  ctx.bindFloat(addBtn, 'bottomLeftRadius', 'radius/sm', 8);
  ctx.bindFloat(addBtn, 'bottomRightRadius', 'radius/sm', 8);

  const addBtnText = figma.createText();
  addBtnText.name = 'Label';
  addBtnText.fontName = { family: 'Inter', style: 'Medium' };
  addBtnText.fontSize = 14;
  addBtnText.characters = '+ Add';
  await ctx.applyTextStyle(addBtnText, 'Label/Medium');
  ctx.bindFill(addBtnText, 'light/text/on-brand', { r: 1, g: 1, b: 1 });
  addBtn.appendChild(addBtnText);

  // ListView 容器
  const listView = figma.createFrame();
  listView.name = 'ListView';
  listView.layoutMode = 'VERTICAL';
  listView.primaryAxisSizingMode = 'FIXED';
  listView.counterAxisSizingMode = 'FIXED';
  listView.fills = [];
  mainScreen.appendChild(listView);
  listView.layoutSizingHorizontal = 'FILL';
  listView.layoutSizingVertical = 'FILL';
  ctx.bindFloat(listView, 'itemSpacing', 'spacing/md', 12);

  const rows = [
    { variant: todoVariant,       title: 'Buy groceries',            due: 'Nov 20' },
    { variant: inProgressVariant, title: 'Prepare project slides',   due: 'Nov 22' },
    { variant: doneVariant,       title: 'Book dentist appointment', due: 'Nov 18' }
  ];

  for (const row of rows) {
    const inst = row.variant.createInstance();
    inst.name = 'ToDoCellItem';
    listView.appendChild(inst);
    inst.layoutSizingHorizontal = 'FILL';

    const propsToUpdate = {};
    if (titlePropKey) propsToUpdate[titlePropKey] = row.title;
    if (duePropKey) propsToUpdate[duePropKey] = row.due;
    if (Object.keys(propsToUpdate).length > 0) {
      inst.setProperties(propsToUpdate);
    }
  }

  // 最下方 LogOut 按鈕（底部保留 spacing/3xl = 32px 間距，文字採 Label/Large + light/text/primary）
  const logoutBtn = secondaryBtnVariant.createInstance();
  logoutBtn.name = 'LogOut';
  mainScreen.appendChild(logoutBtn);
  logoutBtn.layoutSizingHorizontal = 'FILL';
  if (btnLabelPropKey) {
    logoutBtn.setProperties({ [btnLabelPropKey]: 'LogOut' });
  }
  const logoutLabelNode = logoutBtn.findOne(n => n.type === 'TEXT' && n.name === 'Label');
  if (logoutLabelNode) {
    await ctx.applyTextStyle(logoutLabelNode, 'Label/Large');
    ctx.bindFill(logoutLabelNode, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
  }

  await ctx.cleanupEmptyPage1AndSort();
  figma.viewport.scrollAndZoomIntoView([mainScreen]);
  console.log('✅ [Screen: Main] Main Page 建立完成！');
})();
