/**
 * MCPTest Figma Design-as-Code — 共用工具函式庫 (Helpers)
 * ⚠️ 修改本檔後，請務必執行 `sh FigmaDesigner/build_plugin.sh` 同步更新 Figma Plugin。
 *
 * 提供所有 `screens/*.js` 共用的字體載入、Token 綁定器、頁面查詢與排序功能。
 */
async function createFigmaDesignerContext() {
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
  ]);

  const allVars = await figma.variables.getLocalVariablesAsync();
  const varMap = Object.fromEntries(allVars.map(v => [v.name, v]));
  const textStyles = await figma.getLocalTextStylesAsync();
  const tsMap = Object.fromEntries(textStyles.map(t => [t.name, t]));
  const effectStyles = await figma.getLocalEffectStylesAsync();
  const esMap = Object.fromEntries(effectStyles.map(e => [e.name, e]));

  function bindFill(node, varName, fallbackRgb = { r: 1, g: 1, b: 1 }) {
    const v = varMap[varName];
    const basePaint = { type: 'SOLID', color: fallbackRgb };
    node.fills = [v ? figma.variables.setBoundVariableForPaint(basePaint, 'color', v) : basePaint];
  }

  function bindStroke(node, varName, fallbackRgb = { r: 0.9, g: 0.9, b: 0.9 }) {
    const v = varMap[varName];
    const basePaint = { type: 'SOLID', color: fallbackRgb };
    node.strokes = [v ? figma.variables.setBoundVariableForPaint(basePaint, 'color', v) : basePaint];
  }

  function bindFloat(node, prop, varName, fallbackVal) {
    const v = varMap[varName];
    if (v) {
      node.setBoundVariable(prop, v);
    } else if (fallbackVal !== undefined) {
      node[prop] = fallbackVal;
    }
  }

  async function applyTextStyle(textNode, styleName) {
    if (tsMap[styleName]) {
      await textNode.setTextStyleIdAsync(tsMap[styleName].id);
    }
  }

  async function applyEffectStyle(node, styleName) {
    if (esMap[styleName]) {
      await node.setEffectStyleIdAsync(esMap[styleName].id);
    }
  }

  async function getOrCreatePage(targetName, aliases = []) {
    const candidates = [targetName.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
    let page = figma.root.children.find(p =>
      candidates.some(c => p.name.toLowerCase().includes(c))
    );
    if (!page) {
      page = figma.createPage();
      page.name = targetName;
    }
    await figma.setCurrentPageAsync(page);
    return page;
  }

  async function cleanupEmptyPage1AndSort() {
    for (const p of [...figma.root.children]) {
      if (
        p.id !== figma.currentPage.id &&
        p.name === 'Page 1' &&
        figma.root.children.length > 1
      ) {
        await p.loadAsync();
        if (p.children.length === 0) {
          p.remove();
        }
      }
    }

    const compPage = figma.root.children.find(p => p.name === 'Components');
    const nonCompPages = figma.root.children.filter(p => p.name !== 'Components');
    const ordered = compPage ? [...nonCompPages, compPage] : nonCompPages;
    ordered.forEach((p, idx) => {
      try {
        figma.root.insertChild(idx, p);
      } catch (_) {
        // 忽略部分權限限制
      }
    });
  }

  return {
    varMap,
    tsMap,
    esMap,
    bindFill,
    bindStroke,
    bindFloat,
    applyTextStyle,
    applyEffectStyle,
    getOrCreatePage,
    cleanupEmptyPage1AndSort
  };
}
