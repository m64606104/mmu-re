 实现文档📋功能概述实现类似QQ群聊的支持个成员在群中基于各自角色设置进行对话特性顺序✅ 用户点击"生成"后，员依次
- ✅ 所有AI完成，而是生成一个✅ 每个可以生成多条消息打字动画✅ 显示"消息发送中..."提示直第一个开始✅ 每时该的打字动画（头像+跳动圆点）✅ 第一个回复完成后第二个AI开始打字，以此类推消息显示✅ 每条消显示的头像
- ✅ 在上方显示送者名字✅ 群和私聊使用统的气泡样式- ✅ 支持各种媒体类型（图片、视频、语音、表情包等）
角色✅ 的中获取
- ✅ 用户在角色设置后，会自动同步显示✅ 基于的实时查询，确保数据一致性 🔧 技术实现

##1群聊服务(`groupChatService.ts`)增文件提供群的核心P调用逻辑：主要接口：exor infacGAIRplyaiId:string;aiName:string;aiAvatar?:string;messages:Message[];status:'pending'|'typing'|'completed'|'error';error?:string;
}
exportinterfaceGroupChatCallback{  onAIStart?:(aiId:string,aiName:string)=>void;onAITyping?:(aiId:string)=>void;onAIMessage?:(aiId:string,message:Message)=>void;onAIComplete?:(aiId:string,messages:Message[])=>void; onAIError?:(aiId:string,error:string)=>void;onAllComplete?:(llReplies: GupAIReply[])=>void;#核心函数：exportasyncfunctiongenerateGupChatRepis(
 gropConvston: ConveraioapiCfigpiConfgallCnvrston:Cversaiocallback?: GroupChaCllback
)Promise<GroupAIReply[]>#工作：中的2依次每-专用的-群成员列表和群聊环境说明--解析回复并拆条消息3.通过回调逐步通知UI更新：
- `onAIStart` - AI开始回复
   - `onAITyping` - AI正在
   - `onAIMessage` - AI发送单消息-`onComplete`  AI完成回复  - `onAllComplete` - #2.ChatScreen 组件修改#新增状态：
```typescript
cnst [urrentTypngAI, setCurrentTypingAI] = useStte<{
  id: string;
  name: string;
  avatar?: string;
} | nul>(null);
```

####新增函数：
```typescript
const handleGroupGenerate=async () => {
  setIsGeneting(tru);
  setShoSendingHint(true);

  await generateGrupChatReplies(
    convesation,apiConfig,
   convestions,
    {
      onAIStart: (aiId, aiNa) => {
        setShoSendingHint(false);
        cnst aiMembe= conversations.find(c => c.id === aiId);setCurrentTypingAI({  id:aiId,   name:aiName,    avatar:aiMember?.characterSettings?.avatar| aiMember?.avatar});    },
   onMessage: (aid, message) => {        const updatedMessages=...conversation.messages, message;       onUpdateConversation(conversation.id,{          messages:updatedMessages,          lastMessageTimeDate.now()        });     },            onComplete (aiId, messages) =>{        setCurrentTyping(null);
     },            onllComplete (allReplies) => {
       setIsGenerating(false);        setCurrentTyping(null);
       setShowSendingHint(false);      }
    }
  );
};
#U修改：
**1. 在handleGenerate中添加群聊判断：**
``typescriptif(conversationtype=== 'group') { await handleGroupChatGenerate(); return;}
**2.打字动画分离**typescript{/*私聊打字动画*/}{showTyping&&conversation.type === 'private' && (// 原有的打字动画)}{/*群聊打字动画 *}
{curentTypingAI && nversati.typ === 'group' && (
  <div className="flex gap-2 items-ed jusify-tr">
    <div lassName="lativ flex-shrik-0">
      {currentTypingAIavaar ? (    <img src={crrentTypngAI.avata} />
      ) : (
        <div>{crrentTyingAI.name.crA(0)}</div>
      )}
    </div>
    <div clasName="bg-whi unded-2xl x-4py-2.5">   {/* 跳动圆点动画 */}   </div>
</div>
)}
```**3.消息头像显示：**t
{message.role === 'assistant' && (
  <div className="relative flex-shrink-0">
    {conversation.ype === 'group' ? (      ：显发送者的头像
      (message as any).senderAvatar ? (        <mg src={(message as any).seneAvar} />
      ) : (
        <div>{((message as an).enderName || 'AI').charA(0)}</div>
      )
    ) : (
      // 私聊：显示对话角色的头像
      convsatin.characrSttings?.avata ? (
       <im sc={cnvrsation.charactSetting.avatar} />
        (
       <div>{converaion.name.chaAt(0)}</dv>
      )    )}  <div>
)}
```

**4.消息发送者名字：**
```typescript{message.role === 'assstant' && (message asany).sedName && (
  <div clasNme="text-xs xt-gray-500 -1 ml-1">
    {(messag a any.senderName}<div>
)}
```

###3消息数据结构

聊消息在生时会添加额外字段：
```typesript
{
  ...message,
  sedId: Id,         成员的IDsenderName: aiName,       AI员的昵称senderAvatar: aiAvatar,   AI成员的头像🎯使用流程创建群聊1.进入"发起群聊"界面
2.选择要加入群聊的AI成员
3. 设置群名称和群头像
4. 创建群聊

### 群聊对话
1. 用户在群聊中发送消息
2. 点击"生成"按钮
3. 显示"消息发送中..."提示
4. 第AI开始复： - 显示该的头像打字动画   逐条显示该AI的消息
  - 每条消息带有AI的和5.第一个AI完成后，第二个AI开始回复
6.重复步骤4，直所有完成7.隐藏所有提示，到待机状态

## 📝 群聊系统词
为每个AI构建的系统提示词包含：
的基本角色设定群聊环境说明（群名、成员列表）群聊回复原则：
 - 参与，不是每条都要回复 - 简洁回复，避免长篇大论  可以选择性发言或输出`[不回复]`
 - 禁止分析、思考程输出
示例：
```
你是张三。

【群聊环境】：
这是一个名为"朋友群"的群聊
-群员：李四(AI成员)、王五(AI成员)、用户(群主)你需要在群聊中以自己的角色身份自然地参与对话

【群聊回复原则】：
-**自然参与**：像真人在群聊中一样，根据话题和兴趣选择是否回复
- **选择性发言**：不是每条消息都要回复，只在你感兴趣或相关时发言
- **简洁回复**：群聊消息通常较短，避免长篇大论
- **跳过回复**：如果这条消息与你关不感兴趣，输出"[不回复]"```
�角色同机制群聊中的AI信息（头像、名字）以下方式实时同步获取AI成员信息
   ```typescript   const aiMember = conversations.find(c => cid ===aid);
   ```
2使最新的角色设置
   ```typescript
   aiName: aiMember.characterSettings?.nickname || aiMember.name
   aiAvatar: aiMember.characterSettings?.avatar || aiMember.avatar
   ```
3每次生成时实时查询 不缓存AI
   - 每次API调用和UI渲染都获取   确保显示的是

## ⚠️ 注意事项
1.**消息标识**：群聊消息通过`senderd`段识别发送者
2. **类型检查**：使conversation.type === 'group'判断是否为群聊
3. **错误处理**：AI生成失败时会在控制台输出错误但不中断其他AI的回复
4. **性能优化**：   每个的是串行的（避免API限流）
   - 消息之间有800ms延迟（模拟打效果）
   - 只传递最近20条消息作为上下文## 🚀 后续优化方向1. 并发控制可以考虑让部分AI并发回复（如果API支持）
.**智能选择**：让AI更智能地判断是否需要回复3. @提及功能支持@特定成员
4.**消息引用**：支持在群聊中引用其他人的消息
5.**群聊记忆**：为群聊添加记忆系统6. 表情反应支持对群聊消息进行表情反应

## 📊 当前状态

- ✅ 核心功能完成
- ✅ UI交互完成
- ✅角色同步完成
-⏳等待测试和优化