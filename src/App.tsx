import { useState } from 'react'

type TrackRow = { name: string; blocks: string[] }
type MaterialTab = {
  id: string
  title: string
  zoom: string
  split: boolean
  tracks: TrackRow[]
}

const splitTracksTemplate: TrackRow[] = [
  { name: '视频', blocks: ['主画面片段', '补镜头片段'] },
  { name: '人声-说话人1', blocks: ['原声对白', '降噪版本'] },
  { name: '人声-说话人2', blocks: ['情绪迁移-高兴', '情绪迁移-冷静'] },
  { name: '音效', blocks: ['转场咻声', '按钮点击', '环境氛围'] },
  { name: '背景音', blocks: ['轻电子BGM', '钢琴铺底'] },
]

const initialMaterialTabs: MaterialTab[] = [
  {
    id: 'mat-1',
    title: 'brand-launch.mp4',
    zoom: '100%',
    split: true,
    tracks: splitTracksTemplate,
  },
  {
    id: 'mat-2',
    title: 'interview-room.mov',
    zoom: '66.7%',
      split: false,
      tracks: [{ name: '视频', blocks: ['interview-room.mov'] }],
    },
]

const getTrackMeta = (name: string) => {
  if (name.startsWith('视频')) return { short: 'VID', type: 'video' as const, color: 'from-cyan-400/70 to-cyan-600/80' }
  if (name.startsWith('人声')) return { short: 'VOC', type: 'voice' as const, color: 'from-sky-400/70 to-blue-600/80' }
  if (name.startsWith('音效')) return { short: 'SFX', type: 'sfx' as const, color: 'from-fuchsia-400/70 to-violet-600/80' }
  return { short: 'BGM', type: 'bgm' as const, color: 'from-emerald-400/70 to-green-600/80' }
}

const aiLogs = [
  'v1：自动拆轨完成，识别到 2 位说话人并提取人声。',
  'v2：根据语义将 36 句口播自动标注为高兴/冷静/悲伤。',
  'v3：对“说话人1”执行情绪迁移，高兴强度 40% -> 65%。',
  'v4：优化齿音与鼻音，清晰度 +12%，保留原人声特征。',
  'v5：生成对比版本，可一键回退到 v2 / v3 / v4。',
]

const clonedVoices = ['点击克隆', '音色01', '音色02']
const curatedVoices = ['机器人2', '怪物2', '怪物', '女生', '男生', '京腔']
const mySfx = ['片头鼓点', '呼啸转场', '按钮点击']
const curatedSfx = ['赛博冲击', '自然雨声', '电影低频', 'UI 反馈包', '机械臂', '能量脉冲']
const myBgm = ['晨间钢琴', '轻电子循环', '城市Lo-fi']
const curatedBgm = ['电影史诗', '温暖民谣', '悬疑脉冲', '国潮打击', 'Future Bass', '氛围环境']

export default function App() {
  const [assetTab, setAssetTab] = useState<'voice' | 'sfx' | 'bgm'>('voice')
  const [materialTabs, setMaterialTabs] = useState<MaterialTab[]>(initialMaterialTabs)
  const [activeMaterialId, setActiveMaterialId] = useState(initialMaterialTabs[0].id)
  const activeMaterial = materialTabs.find((tab) => tab.id === activeMaterialId)

  const addMaterialTab = () => {
    const newId = `mat-${Date.now()}`
    const newTab: MaterialTab = {
      id: newId,
      title: `new-clip-${materialTabs.length + 1}.mp4`,
      zoom: '100%',
      split: false,
      tracks: [{ name: '视频', blocks: [`new-clip-${materialTabs.length + 1}.mp4`] }],
    }
    setMaterialTabs((prev) => [...prev, newTab])
    setActiveMaterialId(newId)
  }

  const closeMaterialTab = (id: string) => {
    setMaterialTabs((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((tab) => tab.id !== id)
      if (activeMaterialId === id && next.length > 0) {
        setActiveMaterialId(next[0].id)
      }
      return next
    })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,var(--primary)_16%,transparent),transparent_42%)] p-3 text-foreground md:p-4">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="rounded-xl border border-border/80 bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-base font-semibold">项目控制栏</h1>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border border-border px-2 py-1">菜单</span>
              <span className="rounded-md border border-border px-2 py-1">设置</span>
              <span className="rounded-md border border-border px-2 py-1">结构视图</span>
              <span className="rounded-md border border-border px-2 py-1">保存</span>
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                导出
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <aside className="space-y-3">
            <section className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">资产管理</h2>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                {[
                  ['voice', '声音资产'],
                  ['sfx', '音效资产'],
                  ['bgm', '背景音资产'],
                ].map(([key, label]) => {
                  const active = assetTab === key
                  return (
                    <button
                      key={key}
                      onClick={() => setAssetTab(key as 'voice' | 'sfx' | 'bgm')}
                      className={`rounded-md border px-2 py-1.5 transition ${
                        active
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent/60'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {assetTab === 'voice' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">复刻音色</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {clonedVoices.map((name) => (
                        <article
                          key={name}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2.5 transition hover:border-primary/40"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))] text-base text-secondary-foreground">
                            {name === '点击克隆' ? '+' : '声'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="text-[10px] text-primary">
                              {name === '点击克隆' ? '创建复刻' : '我的音色'}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">优质音库</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {curatedVoices.map((name) => (
                        <article
                          key={name}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2.5 transition hover:border-primary/40"
                        >
                          <div className="h-10 w-10 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="text-[10px] text-primary">智作优选</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {assetTab === 'sfx' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">我的音效</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {mySfx.map((name) => (
                        <article
                          key={name}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2.5 transition hover:border-primary/40"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="text-[10px] text-primary">我的音效</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">优质音效库</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {curatedSfx.map((name) => (
                        <article
                          key={name}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2.5 transition hover:border-primary/40"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="text-[10px] text-primary">智作优选</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {assetTab === 'bgm' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">我的背景音</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {myBgm.map((name) => (
                        <article
                          key={name}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2.5 transition hover:border-primary/40"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="text-[10px] text-primary">我的背景音</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">优质背景音库</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {curatedBgm.map((name) => (
                        <article
                          key={name}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2.5 transition hover:border-primary/40"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="text-[10px] text-primary">智作优选</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </aside>

          <section className="space-y-3">
            <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">预览区</h2>
                <div className="flex gap-2 text-xs">
                  <button className="rounded-md border border-border bg-background px-2 py-1">拆轨</button>
                  <button className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                    智能分析
                  </button>
                </div>
              </div>
              <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-border bg-[linear-gradient(120deg,color-mix(in_oklch,var(--muted)_70%,transparent),transparent)] text-center">
                <div>
                  <p className="text-sm font-medium">视频预览展示区</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activeMaterial ? `当前素材：${activeMaterial.title}` : '请在下方导入并选择视频素材'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">专业级多轨界面</h2>
                <div className="flex gap-2 text-xs">
                  <button className="rounded-md border border-border px-2 py-1">对比</button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {materialTabs.map((tab) => {
                    const active = tab.id === activeMaterialId
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveMaterialId(tab.id)}
                        className={`flex shrink-0 items-center gap-2 rounded-md border px-2 py-1 text-xs ${
                          active
                            ? 'border-primary/40 bg-primary/15 text-primary'
                            : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        <span className="max-w-[150px] truncate">{tab.title}</span>
                        <span>{tab.zoom}</span>
                        <span
                          role="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            closeMaterialTab(tab.id)
                          }}
                          className="rounded-sm px-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          ×
                        </span>
                      </button>
                    )
                  })}
                  <button
                    onClick={addMaterialTab}
                    className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border border-border bg-card px-2 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    title="导入新素材"
                  >
                    <span className="text-sm leading-none">+</span>
                    <span>导入视频素材</span>
                  </button>
                </div>
                {activeMaterial && (
                  <div className="overflow-hidden rounded-lg border border-border bg-card/90">
                    <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                      <span>当前素材：{activeMaterial.title}</span>
                      <span>{activeMaterial.split ? '已拆分为多轨' : '单轨（可点击“拆分轨道”）'}</span>
                    </div>
                    <div className="relative border-b border-border bg-background px-3 py-1 text-[10px] text-muted-foreground">
                      <div className="grid grid-cols-12">
                        {['00:00', '00:10', '00:20', '00:30', '00:40', '00:50'].map((mark) => (
                          <span key={mark} className="col-span-2">
                            {mark}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute bottom-0 left-[190px] top-0 w-px bg-foreground/55" />
                      {activeMaterial.tracks.map((row) => {
                        const meta = getTrackMeta(row.name)
                        const isAudio = meta.type !== 'video'
                        return (
                          <div
                            key={`${activeMaterial.id}-${row.name}`}
                            className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-border/70 last:border-b-0"
                          >
                            <div className="flex items-center gap-2 bg-muted/30 px-2 py-2 text-xs text-foreground">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${meta.color} text-[10px] font-semibold text-white`}
                              >
                                {meta.short}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium">{row.name}</p>
                                <p className="text-[10px] text-muted-foreground">{isAudio ? '音频轨道' : '视频轨道'}</p>
                              </div>
                            </div>
                            <div className="relative overflow-hidden bg-background p-2">
                              <div className="absolute inset-0 bg-[repeating-linear-gradient(to_right,transparent_0,transparent_95px,rgba(0,0,0,0.05)_96px)]" />
                              <div className="relative flex min-h-12 items-center gap-2">
                                {row.blocks.map((block, blockIndex) => (
                                  <span
                                    key={block}
                                    className={`group relative overflow-hidden rounded-md border px-2 py-1 text-[11px] ${
                                      isAudio
                                        ? 'border-sky-300/80 bg-sky-100 text-sky-900'
                                        : 'border-cyan-300/80 bg-cyan-100 text-cyan-900'
                                    }`}
                                    style={{ width: `${blockIndex === 0 ? 38 : 22}%` }}
                                  >
                                    <span className="relative z-10 truncate">{block}</span>
                                    {isAudio && (
                                      <span className="pointer-events-none absolute inset-0 opacity-35 [background:repeating-linear-gradient(90deg,transparent_0,transparent_6px,rgba(2,132,199,.45)_6px,rgba(2,132,199,.45)_8px)]" />
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-3">
            <section className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">AI 智能分析面板</h2>
                <button className="rounded-md border border-border px-2 py-1 text-xs">开始分析</button>
              </div>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li>1. 自动检测音频片段，输出语种、音色、情绪等初始标签。</li>
                <li>2. 按语义切句并识别说话人，支持从视频分轨中抽取可训练音频。</li>
                <li>3. 结合目标情绪生成迁移建议，并推荐最佳 Prompt 与参数。</li>
                <li>4. 输出替换风险提示（口型偏差、爆破音、背景噪声冲突）。</li>
                <li>5. 一键提交到右侧精细调优，或写入资产库形成可复用模板。</li>
              </ol>
            </section>

            <section className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold">精细调优面板</h2>
              <div className="space-y-2 text-xs">
                {[
                  ['情绪强度', '72%'],
                  ['语速', '1.08x'],
                  ['清晰度', '68%'],
                  ['呼吸感', '35%'],
                  ['拟真度', '84%'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md border border-border bg-background/70 p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span>{k}</span>
                      <span className="text-primary">{v}</span>
                    </div>
                    <div className="h-1.5 rounded bg-muted">
                      <div className="h-full rounded bg-primary" style={{ width: v }} />
                    </div>
                  </div>
                ))}
                <p className="rounded-md bg-primary/10 p-2 text-primary">
                  LUFs 控制、EQ 微调、气息修复等高级能力可在此继续下钻。
                </p>
              </div>
            </section>
          </aside>
        </section>

        <footer className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">AI 操作日志（可回退版本）</h2>
            <div className="flex gap-2 text-xs">
              <button className="rounded-md border border-border px-2 py-1">试听</button>
              <button className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                应用当前版本
              </button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {aiLogs.map((log) => (
              <article key={log} className="rounded-md border border-border bg-background/70 p-2 text-xs">
                {log}
              </article>
            ))}
          </div>
        </footer>
      </div>
    </main>
  )
}
