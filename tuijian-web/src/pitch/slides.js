/* 幻灯片内容。改文案改这里，路由页与离线版共用这一份。 */
const slides = [];

/* 01 封面 */
slides.push(`
<section class="slide dark cover">
  <div class="glow"></div><div class="dots"></div>
  <div class="left">
    <div class="brand"><span class="t">推</span><span class="j">鉴</span></div>
    <div class="slogan">推一篇<em>好文案</em>，鉴<em>每一个细节</em>。</div>
    <div class="by"><span>制作人</span><b>吴耀好</b><span class="dot"></span><span>浙江大学 · 计算机技术 · 智能体方向</span></div>
    <div class="meta">
      <div><b>10</b><span>产品</span></div>
      <div><b>41</b><span>客户场景</span></div>
      <div><b>8</b><span>平台</span></div>
      <div><b>3280</b><span>种组合</span></div>
    </div>
  </div>
  <div class="stack">
    <div class="sc"><span class="no">01</span><span class="nm">产品卡片</span><span class="ds">一台机器一张卡</span></div>
    <div class="sc"><span class="no">02</span><span class="nm">客户卡片</span><span class="ds">41 类使用场景</span></div>
    <div class="sc hot"><span class="no">03</span><span class="nm">平台卡片</span><span class="ds">8 个渠道语体</span></div>
    <div class="sc"><span class="no">04</span><span class="nm">选题 · 热点 · 素材</span><span class="ds">可增可改</span></div>
    <div class="sc"><span class="no">05</span><span class="nm">AI 需求卡片</span><span class="ds">一句话变成卡</span></div>
  </div>
</section>`);

/* 02 推 / 鉴 */
slides.push(`
<section class="slide halves">
  <div class="half l">
    <div class="wm">推</div>
    <div class="lab">推</div>
    <h2>生成一篇推文</h2>
    <p>七类卡片点选，系统自己把这个产品的卖点组织成一篇能发的营销文案。</p>
    <ul>
      <li>先规划：定切入角度与卖点顺序</li>
      <li>再写作：按平台的语体落笔</li>
      <li>全程不出键盘</li>
    </ul>
  </div>
  <div class="half r">
    <div class="wm">鉴</div>
    <div class="lab">鉴</div>
    <h2>鉴别这篇推文</h2>
    <p>质量、说法、数据逐项核：用了哪些素材、场景判断是否成立、每个参数引自哪条原文。</p>
    <ul>
      <li>五类依据全部可点开</li>
      <li>核验不通过，不许定稿</li>
      <li>编号由模型写，原文由程序回填</li>
    </ul>
  </div>
</section>`);

/* 03 零输入 */
slides.push(`
<section class="slide">
  <div class="head"><div class="eb">输入层</div>
    <h1>从开始到发布，<span class="hi">一个字都不用打</span></h1></div>
  <div class="zero">
    <div class="big">0<span>字输入</span></div>
    <div>
      <div class="zt"><span class="s">生成前</span><span class="a">产品 / 客户 / 平台 / 选题 / 热点 / 素材，七类卡片点选</span><span class="b">0 字</span></div>
      <div class="zt"><span class="s">自定义需求</span><span class="a">AI 先分析你的想法，再把它变成一组可点选的卡片</span><span class="b">0 字</span></div>
      <div class="zt"><span class="s">整篇重写</span><span class="a">AI 分析全文后按新方向重写，事实边界不动</span><span class="b">0 字</span></div>
      <div class="zt"><span class="s">局部重写</span><span class="a">选一段重写，出多个版本并排对比，选最优</span><span class="b">0 字</span></div>
    </div>
  </div>
  <div class="foot"><span>不是把输入变少，是把输入变成选择</span><span class="pn">03</span></div>
</section>`);

/* 04 卡片 */
slides.push(`
<section class="slide">
  <div class="head"><div class="eb">卡片系统</div>
    <h1>一张卡 = 一个维度的选项，<span class="hi">点一下就定了</span></h1></div>
  <div class="cards">
    <div class="clist">
      <div class="ccard"><span class="nm">产品卡片</span><span class="ds">10 张，精确到版本：14 酷睿 Ultra、Pro S、D14…</span></div>
      <div class="ccard"><span class="nm">客户卡片</span><span class="ds">41 类场景：政企、教育、移动办公、学生…</span></div>
      <div class="ccard"><span class="nm">平台卡片</span><span class="ds">8 个渠道：公众号、朋友圈、小红书、长图、采购方案…</span></div>
      <div class="ccard"><span class="nm">选题卡片</span><span class="ds">这篇从哪个角度切入、先讲什么</span></div>
      <div class="ccard"><span class="nm">热点卡片</span><span class="ds">当下可借的时事与节点</span></div>
      <div class="ccard"><span class="nm">素材卡片</span><span class="ds">这次用哪几份产品资料，可多选</span></div>
      <div class="ccard"><span class="nm">AI 需求卡片</span><span class="ds">把一句自由描述，变成可复用的卡片</span></div>
      <div class="ccard plus"><span class="nm">＋ 自定义卡片</span><span class="ds">库里没有的维度，自己加一张，随建随用</span></div>
    </div>
    <div class="numbox">
      <div class="n">3280</div>
      <div class="f"><b>10 产品 × 41 客户场景 × 8 平台</b>再乘选题、热点、素材，进入十万级组合。</div>
    </div>
  </div>
  <div class="foot"><span>缺什么卡，就加什么卡：卡片可增可改，新场景不用等版本</span><span class="pn">04</span></div>
</section>`);

/* 05 工作流主干 */
slides.push(`
<section class="slide s05">
  <div class="head"><div class="eb">多智能体 · 主干</div>
    <h1>从点卡到初稿，<span class="hi">五个执行 · 一个记忆</span></h1></div>
  <div class="mem">
    <span class="lb">记忆层<b>MEMORY AGENT</b></span>
    <span class="tx">全程共享同一份上下文：<em>你选了哪些卡、写作包长什么样、审核挑出哪几句、你改过什么</em>——
    每个智能体都读得到、写得上，不用你复述，也不会各记一份。</span>
  </div>
  <div class="conn"><i></i><i></i><i></i><i></i></div>
  <div class="flow">
    <div class="ph">
      <div class="st">阶段 1</div>
      <div class="ag"><em>推荐 agent</em>补全你不知道的信息</div>
      <div class="do">读完产品与平台卡片，给出匹配的目标用户、当下可用热点、相关素材清单。</div>
      <div class="give"><b>交付</b>目标用户 · 热点 · 素材清单</div>
    </div>
    <div class="ph">
      <div class="st">阶段 2</div>
      <div class="ag"><em>需求 agent</em>多轮追问，一轮一问</div>
      <div class="do">缺什么问什么，把要求收拢成可执行的样子；问不清就不往下走。</div>
      <div class="give"><b>产出</b>创作要求</div>
    </div>
    <div class="ph key">
      <div class="st">阶段 3</div>
      <div class="ag"><em>总结 agent</em>装订成写作包</div>
      <div class="do">产品事实、客户场景、平台语体、选题角度、可用素材、禁区，装成一份写作包。</div>
      <div class="give"><b>交付</b>写作包</div>
    </div>
    <div class="ph">
      <div class="st">阶段 4</div>
      <div class="ag"><em>写作 agent</em>先规划，再落笔</div>
      <div class="do">按写作包定骨架、排卖点顺序，事实句挂编号，生成图文初稿。</div>
      <div class="give"><b>交付</b>图文初稿</div>
    </div>
  </div>
  <div class="backbar"><span>下一环</span><span class="ln"></span><b>审核 agent 逐项复核 → 交给你定稿</b></div>
  <div class="foot"><span>记忆层保证六个智能体看到的是同一份事实，不是六份</span><span class="pn">05</span></div>
</section>`);

/* 06 回路图 */
slides.push(`
<section class="slide">
  <div class="head"><div class="eb">多智能体 · 回路</div>
    <h1>通过就发，不通过就<span class="hi">回到写作</span></h1></div>
  <div class="loopwrap">
    <svg viewBox="0 0 1696 548" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="ahg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#9aa1aa"/>
        </marker>
        <marker id="ahr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#cf0a2c"/>
        </marker>
      </defs>
      <path d="M402,72 H552" fill="none" stroke="#9aa1aa" stroke-width="2" marker-end="url(#ahg)"/>
      <path d="M558,116 H410" fill="none" stroke="#cf0a2c" stroke-width="2" stroke-dasharray="7 6" marker-end="url(#ahr)"/>
      <path d="M922,72 H1072" fill="none" stroke="#9aa1aa" stroke-width="2" marker-end="url(#ahg)"/>
      <path d="M1400,140 V322" fill="none" stroke="#318675" stroke-width="2" marker-end="url(#ahg)"/>
      <path d="M1100,140 V225" fill="none" stroke="#9aa1aa" stroke-width="2"/>
      <path d="M1100,225 H740 V322" fill="none" stroke="#9aa1aa" stroke-width="2" marker-end="url(#ahg)"/>
      <path d="M558,385 H410" fill="none" stroke="#9aa1aa" stroke-width="2" marker-end="url(#ahg)"/>
      <path d="M200,330 V140" fill="none" stroke="#9aa1aa" stroke-width="2" marker-end="url(#ahg)"/>
      <text x="479" y="60" text-anchor="middle">初稿</text>
      <text x="484" y="140" text-anchor="middle" class="rd">不通过 · 直接打回</text>
      <text x="999" y="60" text-anchor="middle">审核意见</text>
      <text x="1410" y="238">通过 · 定稿发布</text>
      <text x="920" y="212" text-anchor="middle">不满意</text>
      <text x="484" y="372" text-anchor="middle">逐段评价</text>
      <text x="212" y="242">修改要求</text>
    </svg>
    <div class="agbox" style="left:calc(40 * var(--u));top:calc(20 * var(--u))">
      <span class="t1">写作 AGENT</span><span class="t2">先规划，再落笔</span>
      <span class="t3">按写作包定骨架、排卖点，事实句挂编号</span></div>
    <div class="agbox key" style="left:calc(560 * var(--u));top:calc(20 * var(--u))">
      <span class="t1">审核 AGENT</span><span class="t2">逐项复核</span>
      <span class="t3">产品事实 · 图片型号 · 合规 · 平台适配</span></div>
    <div class="agbox me" style="left:calc(1080 * var(--u));top:calc(20 * var(--u))">
      <span class="t1">你</span><span class="t2">看稿、定稿</span>
      <span class="t3">通过就发，不满意就点</span></div>
    <div class="agbox" style="left:calc(40 * var(--u));top:calc(330 * var(--u))">
      <span class="t1">需求 AGENT</span><span class="t2">把不满意翻译成要求</span>
      <span class="t3">仍然一轮一问，问到能落地</span></div>
    <div class="agbox" style="left:calc(560 * var(--u));top:calc(330 * var(--u))">
      <span class="t1">评价 AGENT</span><span class="t2">逐段给评价</span>
      <span class="t3">这段强在哪、弱在哪、和哪段重复</span></div>
    <div class="agbox ok" style="left:calc(1080 * var(--u));top:calc(330 * var(--u))">
      <span class="t1">发布</span><span class="t2">定稿即交付</span>
      <span class="t3">预览看到的就是导出的那一份</span></div>
  </div>
  <div class="foot"><span>回到写作 agent 时，前几轮的选择和意见还在记忆层里，不用你重讲一遍</span><span class="pn">06</span></div>
</section>`);

/* 07 记忆层 */
slides.push(`
<section class="slide s07">
  <div class="head"><div class="eb">记忆层 · MEMORY AGENT</div>
    <h1>六个智能体，<span class="hi">共用一份记忆</span></h1></div>
  <div class="mem2">
    <div>
      <div class="mrow"><span class="k">选择记录<span>你写的</span></span>
        <span class="v">选了哪台机型、哪类客户、哪个平台、哪几张素材——第一版和第五版指的是同一件事</span></div>
      <div class="mrow"><span class="k">写作包<span>总结 agent 写</span></span>
        <span class="v">事实、要求、禁区装订成一份，写作 agent 直接拿去用，不再自己猜</span></div>
      <div class="mrow"><span class="k">审核与评价<span>审核 / 评价 agent 写</span></span>
        <span class="v">哪句没过、为什么、哪段重复了——下一轮改写照单执行</span></div>
      <div class="mrow"><span class="k">改动历史<span>你写的</span></span>
        <span class="v">第几版改了什么、以哪一版为准，随时可回退</span></div>
    </div>
    <div>
      <div class="fn"><b>① 记</b><span>每个 agent 写进来的都记下，带来源和时间，不靠谁"记得住"</span></div>
      <div class="fn"><b>② 压</b><span>上下文要满时压成摘要，但产品事实与数字原样保留，不压缩</span></div>
      <div class="fn"><b>③ 投</b><span>按需投喂：写作 agent 只拿写作包，审核 agent 只拿事实表，互不污染</span></div>
      <div class="rule"><b>冲突怎么办</b>：以你最后一次的选择为准，旧版本降级成参考</div>
    </div>
  </div>
  <div class="band2">
    <div class="no"><b>没有记忆层</b>每轮都重新猜你改过什么，上下文一长就互相打架，改到第三版开始跑偏</div>
    <div class="yes"><b>有记忆层</b>选择、写作包、审核意见、改动历史在同一份里，改到第五版依然对得上第一版</div>
  </div>
  <div class="foot"><span>所以改到第五版，第一版定下的要求还在</span><span class="pn">07</span></div>
</section>`);

/* 07 鉴 */
slides.push(`
<section class="slide">
  <div class="head"><div class="eb">鉴</div>
    <h1>文案是结果，<span class="hi">依据是过程</span></h1></div>
  <div class="ev">
    <div>
      <div class="evrow"><span class="k">使用素材</span><span class="v">这篇引了哪几份资料，哪几份被判不相关</span></div>
      <div class="evrow"><span class="k">场景判断</span><span class="v">它认为这是什么场景、写给谁看</span></div>
      <div class="evrow"><span class="k">知识库依据</span><span class="v">每个卖点、参数引自哪一条原文</span></div>
      <div class="evrow"><span class="k">配图来源</span><span class="v">每一张图都取自产品数据库，不是模型生成，型号对得上</span></div>
      <div class="evrow"><span class="k">平台适配</span><span class="v">为什么是这个长度、这个语气</span></div>
      <div class="evrow"><span class="k">核验结果</span><span class="v">每一句通过还是没通过</span></div>
    </div>
    <div class="mock">
      <div class="mh">结果页 · 编号与原文对照</div>
      <div class="line"><span class="ref">f_5</span><span>14 酷睿 Ultra 搭载 2.8K OLED 触控屏　<span class="ok">✓ 原文一致</span></span></div>
      <div class="line"><span class="ref">f_7</span><span>机身重量 1.31 kg　<span class="ok">✓ 型号匹配</span></span></div>
      <div class="line"><span class="ref">f_9</span><span>续航口径与官方资料一致　<span class="ok">✓ 合规</span></span></div>
      <div class="line"><span class="ref">f_2</span><span>该卖点不适用于本客户场景　<span class="no-ok">✕ 已剔除</span></span></div>
    </div>
  </div>
  <div class="foot"><span>它交的不只是一篇稿子，还有这篇稿子为什么成立</span><span class="pn">08</span></div>
</section>`);

/* 08 企业价值 */
slides.push(`
<section class="slide s08">
  <div class="head"><div class="eb">企业价值</div>
    <h1>引入它不是加个工具，是<span class="hi">替掉一条写稿链</span></h1></div>
  <div class="dd">
    <div class="ddc">
      <div class="h"><b>降本</b><span>省的是人力，不是分钟</span></div>
      <div class="it"><span class="no">01</span><span class="tx"><b>一条写稿链的人力</b>：产品出资料、市场写稿、设计配图、再逐级审，现在一个人点卡出稿。</span></div>
      <div class="it"><span class="no">02</span><span class="tx"><b>一次返工就是一整篇</b>：型号错、参数错、平台不合规，过去发出去才发现；现在发布前就拦下。</span></div>
      <div class="it"><span class="no">03</span><span class="tx"><b>新人不用再熬经验</b>：怎么写、哪些话不能说、各平台什么口径，都写在卡片和知识库里，新人第一天就按同一套标准写。</span></div>
    </div>
    <div class="ddc">
      <div class="h"><b>增效</b><span>快的是节奏，不只是速度</span></div>
      <div class="it"><span class="no">01</span><span class="tx"><b>从排期等稿到当场出稿</b>：不用等总部或代理排期，门店当天要投就当天有。</span></div>
      <div class="it"><span class="no">02</span><span class="tx"><b>一个人覆盖全部产品与渠道</b>：10 产品 × 41 客户 × 8 平台，同一套流程，不用为每个组合建模板。</span></div>
      <div class="it"><span class="no">03</span><span class="tx"><b>越改越准，不是越改越乱</b>：每一轮修改都落在同一份记忆上，改到第五版依然对得上第一版的要求。</span></div>
    </div>
  </div>
  <div class="band">
    <div><b>改习惯的代价被压到最小</b>只改一个动作：把打字换成点卡</div>
    <div><b>不用重新培训</b>不学提示词、不记平台规则，会点鼠标就会用</div>
    <div><b>收益是结构性的</b>省下来的是整条链的排期，不是一次沟通</div>
  </div>
  <div class="punch">小改动不值得改习惯，所以它<span class="hi">不是更快的打字机，是另一个写字的人</span>。</div>
  <div class="foot"><span>降本：一条写稿链的人力与返工　增效：一次成稿的交付节奏</span><span class="pn">09</span></div>
</section>`);

/* 09 现场演示 */
slides.push(`
<section class="slide">
  <div class="head"><div class="eb">现场演示</div>
    <h1>接下来，<span class="hi">真机跑一遍</span></h1></div>
  <div class="steps">
    <div class="step"><div class="n">1</div><h3>点卡</h3><p>产品 → 客户 → 平台，全程不出键盘</p></div>
    <div class="step"><div class="n">2</div><h3>生成</h3><p>先出写作包，再落一篇完整推文</p></div>
    <div class="step"><div class="n">3</div><h3>看鉴</h3><p>素材、场景、依据、核验，逐项摊开</p></div>
    <div class="step"><div class="n">4</div><h3>改到能发</h3><p>评价、追问、局部重写，选一版定稿</p></div>
  </div>
  <div class="endline">
    <div class="mark">推<span class="j">鉴</span></div>
    <div class="sl">推一篇<em>好文案</em>，鉴<em>每一个细节</em>。</div>
  </div>
  <div class="foot"><span>从点第一张卡开始</span><span class="pn">10</span></div>
</section>`);

export default slides;
