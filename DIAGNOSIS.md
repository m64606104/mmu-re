# 自定义笔友数据诊断指南

## 📊 查看控制台日志

打开笔友列表后，在浏览器控制台（F12）你会看到以下日志之一：

### ✅ 情况1：数据成功恢复
```
🔍 开始加载自定义笔友...
📊 IndexedDB返回数据: undefined
🔍 localStorage检查: 有数据(1234字符)
🔄 发现3个旧的自定义笔友，正在迁移到IndexedDB...
📝 笔友列表: 李泽言, 夜神月, 其他角色
✅ 自定义笔友数据迁移完成！
📚 最终加载了3个自定义笔友
👥 笔友名单: 李泽言(custom_penpal_xxx), 夜神月(custom_penpal_yyy)...
```
**结果**：✅ 数据恢复成功！

---

### ❌ 情况2：数据真的丢失了
```
🔍 开始加载自定义笔友...
📊 IndexedDB返回数据: undefined
🔍 localStorage检查: 无数据
ℹ️ localStorage中没有旧数据
📚 最终加载了0个自定义笔友
```
**结果**：❌ 数据确实不存在了

---

### ℹ️ 情况3：数据已经在IndexedDB中
```
🔍 开始加载自定义笔友...
📊 IndexedDB返回数据: 3项
🔍 localStorage检查: 有数据(1234字符)
✅ IndexedDB中已有数据，跳过迁移
📚 最终加载了3个自定义笔友
👥 笔友名单: 李泽言(custom_penpal_xxx)...
```
**结果**：✅ 数据一直都在

---

## 🔧 如果看到"无数据"怎么办？

### 方法1：检查localStorage（手动）
在控制台输入：
```javascript
localStorage.getItem('custom_pen_pals')
```

如果返回：
- `null` → 数据确实丢失了
- 一串JSON → 数据还在，但加载失败

---

### 方法2：检查IndexedDB（手动）
1. 打开开发者工具 → Application标签
2. 找到IndexedDB → MomoYuDB → data_store
3. 查找key: `custom_pen_pals`

如果找到数据 → 数据还在，只是显示有问题

---

### 方法3：尝试手动迁移
如果localStorage有数据但迁移失败，在控制台输入：
```javascript
(async () => {
  const data = localStorage.getItem('custom_pen_pals');
  if (data) {
    const { save } = await import('/src/utils/storage.ts');
    await save('custom_pen_pals', JSON.parse(data));
    console.log('✅ 手动迁移完成，请刷新页面');
  }
})();
```

---

## 💡 数据真的丢失了？

**可能的原因：**
1. 清理了浏览器数据（清除Cookie/缓存时误删）
2. 使用了隐私/无痕模式
3. 切换了浏览器或设备
4. localStorage超出配额被清空
5. 浏览器崩溃导致数据损坏

**解决办法：**
- 重新创建自定义笔友
- 如果有导出的备份JSON，可以导入
- 下次创建后建议导出备份

---

## 🎯 预防措施

创建自定义笔友后：
1. 进入"数据管理"
2. 导出所有数据
3. 保存JSON文件作为备份
