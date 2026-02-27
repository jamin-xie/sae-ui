import { useEffect, useState } from 'react'

type TrackRow = { name: string; blocks: string[] }
type AssetTab = 'sfx' | 'music' | 'my_assets' | 'ai_create'
type CreateChannel = 'sfx' | 'music' | 'voice'
type LibraryFilterTab = 'sfx' | 'music'
type MyAssetCategory = 'all' | 'sfx' | 'music'
type ProofreadStatus = 'idle' | 'running' | 'done'
type ProofreadIssueType = 'noise' | 'plosive' | 'misread'
type CuratedAsset = { name: string; tags: string[]; keywords: string[] }
type MyAsset = { name: string; type: 'sfx' | 'music'; source: '收藏' | '上传' | '轨道导入'; aiTags: string[] }
type ClipContextMenuState = {
  x: number
  y: number
  materialId: string
  trackName: string
  blockName: string
  assetType: 'sfx' | 'music'
}
type ClipPlaybackState = {
  clipKey: string
  progress: number
  running: boolean
}
type TrackVersion = {
  id: string
  label: string
  summary: string
  kind: 'original' | 'applied'
  waveform: number[]
}
type ComparePlaybackState = {
  progress: number
  running: boolean
  targetId: string
}
type MaterialTab = {
  id: string
  title: string
  zoom: string
  split: boolean
  tracks: TrackRow[]
}
type ProofreadIssue = {
  id: string
  type: ProofreadIssueType
  trackName: string
  blockName: string
  timeLabel: string
  clipProgress: number
  title: string
  originalText?: string
  detectedText?: string
}
type AssistantCardKind = 'bgm' | 'eq' | 'regenerate' | 'ducking'
type AssistantCard = { id: string; kind: AssistantCardKind; title: string; description: string }
type AssistantMessage = { id: string; role: 'user' | 'assistant'; text: string; cards?: AssistantCard[] }

const splitTracksTemplate: TrackRow[] = [
  { name: '视频', blocks: ['主画面片段', '补镜头片段'] },
  { name: '人声-说话人1', blocks: ['原声对白', '降噪版本'] },
  { name: '人声-说话人2', blocks: ['情绪迁移-高兴', '情绪迁移-冷静'] },
  { name: '音效', blocks: ['转场咻声', '按钮点击', '环境氛围'] },
  { name: '背景音', blocks: ['轻电子BGM', '钢琴铺底'] },
]

const buildSplitTracks = (title: string): TrackRow[] => {
  const prefix = title.replace(/\.[^.]+$/, '')
  return splitTracksTemplate.map((row) => ({
    name: row.name,
    blocks: row.blocks.map((block) => `${prefix}-${block}`),
  }))
}

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

const getTrackTuning = (trackName: string) => {
  const meta = getTrackMeta(trackName)
  if (meta.type === 'video') {
    return {
      channel: '视频轨通道',
      profile: '画面同步模式',
      tabs: ['Compressor', 'Noise Gate', 'Reverb'],
      controls: [
        { label: '同步偏移(ms)', value: '24%', amount: '+12ms' },
        { label: '瞬态保护', value: '52%', amount: '中' },
        { label: '高频抑制', value: '33%', amount: '-3dB' },
        { label: '低频清理', value: '47%', amount: '-6dB' },
      ],
      meter: '视频伴音稳定度',
      meterValue: '71%',
      rangeLeft: '-18dB',
      rangeCenter: '-6dB',
      rangeRight: '0dB',
    }
  }
  if (meta.type === 'voice') {
    return {
      channel: '人声轨通道',
      profile: 'AI 主人声',
      tabs: ['Compressor', 'Noise Gate', 'Reverb'],
      controls: [
        { label: '低切(Hz)', value: '38%', amount: '82Hz' },
        { label: '齿音抑制(kHz)', value: '56%', amount: '5.2kHz' },
        { label: '中频聚焦(kHz)', value: '44%', amount: '1.8kHz' },
        { label: '混响发送', value: '26%', amount: '12%' },
      ],
      meter: 'LUFs 实时监测',
      meterValue: '64%',
      rangeLeft: '-16dB',
      rangeCenter: '-8dB',
      rangeRight: '0dB',
    }
  }
  if (meta.type === 'sfx') {
    return {
      channel: '音效轨通道',
      profile: '冲击增强',
      tabs: ['Compressor', 'Transient', 'Limiter'],
      controls: [
        { label: '瞬态增强', value: '61%', amount: '+6dB' },
        { label: '压缩阈值', value: '41%', amount: '-9dB' },
        { label: '立体声宽度', value: '58%', amount: '120%' },
        { label: '尾音衰减', value: '36%', amount: '220ms' },
      ],
      meter: '峰值保护',
      meterValue: '52%',
      rangeLeft: '-12dB',
      rangeCenter: '-5dB',
      rangeRight: '0dB',
    }
  }
  return {
    channel: '背景音轨通道',
    profile: '氛围铺底',
    tabs: ['Compressor', 'Ducking', 'Reverb'],
    controls: [
      { label: '人声闪避', value: '46%', amount: '-5dB' },
      { label: '低频滚降', value: '29%', amount: '95Hz' },
      { label: '立体声扩展', value: '64%', amount: '132%' },
      { label: '空间感', value: '48%', amount: '中' },
    ],
    meter: '背景音占比',
    meterValue: '58%',
    rangeLeft: '-20dB',
    rangeCenter: '-10dB',
    rangeRight: '0dB',
  }
}

const aiLogs = [
  'v1：自动拆轨完成，识别到 2 位说话人并提取人声。',
  'v2：根据语义将 36 句口播自动标注为高兴/冷静/悲伤。',
  'v3：对“说话人1”执行情绪迁移，高兴强度 40% -> 65%。',
  'v4：优化齿音与鼻音，清晰度 +12%，保留原人声特征。',
  'v5：生成对比版本，可一键回退到 v2 / v3 / v4。',
]

const initialClonedVoices = ['音色01', '音色02']
const curatedVoices: CuratedAsset[] = [
  { name: '机器人2', tags: ['AI声线', '科技', '中性'], keywords: ['机器人', '电子', '解说'] },
  { name: '怪物2', tags: ['角色', '低沉', '电影感'], keywords: ['怪物', '反派', '预告片'] },
  { name: '怪物', tags: ['角色', '暗黑', '冲击'], keywords: ['厚重', '怒吼', '氛围'] },
  { name: '女生', tags: ['人声', '清亮', '广告'], keywords: ['女声', '口播', '温柔'] },
  { name: '男生', tags: ['人声', '稳重', '旁白'], keywords: ['男声', '纪录片', '配音'] },
  { name: '京腔', tags: ['方言', '特色', '剧情'], keywords: ['北京话', '角色音', '方言配音'] },
]
const mySfx = ['片头鼓点', '呼啸转场', '按钮点击']
const curatedSfx: CuratedAsset[] = [
  { name: '赛博冲击', tags: ['赛博', '冲击', '转场'], keywords: ['科技感', '重击', '动作'] },
  { name: '自然雨声', tags: ['自然', '环境', '氛围'], keywords: ['雨滴', '白噪声', '背景'] },
  { name: '电影低频', tags: ['电影', '低频', '悬疑'], keywords: ['boom', '紧张', '预告片'] },
  { name: 'UI 反馈包', tags: ['UI', '交互', '轻量'], keywords: ['点击', '提示', '界面'] },
  { name: '机械臂', tags: ['机械', '金属', '工业'], keywords: ['机器人', '关节', '运镜'] },
  { name: '能量脉冲', tags: ['科幻', '能量', '节奏'], keywords: ['脉冲', '电流', '未来感'] },
]
const myMusic = ['晨间钢琴', '轻电子循环', '城市Lo-fi']
const curatedMusic: CuratedAsset[] = [
  { name: '电影史诗', tags: ['史诗', '管弦', '大场面'], keywords: ['预告片', '宏大', '情绪推进'] },
  { name: '温暖民谣', tags: ['民谣', '温暖', '生活'], keywords: ['木吉他', 'Vlog', '轻松'] },
  { name: '悬疑脉冲', tags: ['悬疑', '节奏', '紧张'], keywords: ['脉冲', '推理', '压迫感'] },
  { name: '国潮打击', tags: ['国风', '打击', '节庆'], keywords: ['鼓点', '中国风', '品牌片'] },
  { name: 'Future Bass', tags: ['电子', '动感', '青年'], keywords: ['drop', '活力', '科技发布'] },
  { name: '氛围环境', tags: ['Ambient', '铺底', '空间'], keywords: ['氛围', '空灵', '背景层'] },
]
const initialMyAssets: MyAsset[] = [
  { name: '品牌宣传BGM-v2', type: 'music', source: '上传', aiTags: ['品牌', '宣传', '温暖'] },
  { name: '转场点击包-A', type: 'sfx', source: '上传', aiTags: ['转场', '点击', 'UI'] },
]
const createChannelLabel: Record<CreateChannel, string> = {
  sfx: '音效',
  music: '音乐',
  voice: '人声',
}
const assistantQuickPrompts = ['帮我听听配音和文案搭不搭', '推荐一个适合这段画面的BGM']
const warmBgmCandidates = ['暖阳木吉他', '晨光叙事', '温柔片尾钢琴']

const buildAiTags = (type: 'sfx' | 'music', blockName: string) => {
  const baseTags = type === 'sfx' ? ['音效', '轨道提取'] : ['音乐', '轨道提取']
  const rules: Array<[RegExp, string]> = [
    [/转场|切换|过门/i, '转场'],
    [/点击|按钮|提示/i, '交互'],
    [/环境|氛围|ambient/i, '氛围'],
    [/电子|赛博|pulse/i, '科技'],
    [/钢琴|piano/i, '钢琴'],
    [/低频|boom/i, '低频'],
  ]
  const matched = rules.filter(([pattern]) => pattern.test(blockName)).map(([, tag]) => tag)
  return Array.from(new Set([...baseTags, ...matched, 'AI自动标注']))
}

const getCuratedTags = (assets: CuratedAsset[]) => Array.from(new Set(assets.flatMap((asset) => asset.tags)))

const filterCuratedAssets = (assets: CuratedAsset[], query: string, selectedTags: string[]) => {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  return assets.filter((asset) => {
    const searchText = `${asset.name} ${asset.tags.join(' ')} ${asset.keywords.join(' ')}`.toLowerCase()
    const keywordMatched = terms.length === 0 || terms.every((term) => searchText.includes(term))
    const tagsMatched = selectedTags.length === 0 || selectedTags.every((tag) => asset.tags.includes(tag))
    return keywordMatched && tagsMatched
  })
}

const buildWaveform = (seedText: string, strength = 0) => {
  const seed = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return Array.from({ length: 56 }, (_, index) => {
    const base = (Math.sin((index + seed) * 0.35) + 1) * 22
    const ripple = (Math.cos((index + seed) * 0.17) + 1) * 12
    const shape = strength > 10 ? Math.sin((index + seed) * 0.09) * strength * 0.9 : 0
    const value = 10 + base + ripple + strength + shape
    return Math.max(6, Math.min(94, Number(value.toFixed(1))))
  })
}

const buildDefaultTrackVersions = (trackKey: string): TrackVersion[] => {
  const original: TrackVersion = {
    id: `${trackKey}-origin`,
    label: '原始版本',
    summary: '轨道初始状态',
    kind: 'original',
    waveform: buildWaveform(trackKey, 0),
  }
  const v1: TrackVersion = {
    id: `${trackKey}-v1`,
    label: '版本 1',
    summary: '基础降噪 + 轻压缩',
    kind: 'applied',
    waveform: buildWaveform(`${trackKey}-v1`, 10),
  }
  const v2: TrackVersion = {
    id: `${trackKey}-v2`,
    label: '版本 2',
    summary: '中频增强 + 齿音抑制',
    kind: 'applied',
    waveform: buildWaveform(`${trackKey}-v2`, 22),
  }
  const v3: TrackVersion = {
    id: `${trackKey}-v3`,
    label: '版本 3',
    summary: '空间感优化 + 动态平衡',
    kind: 'applied',
    waveform: buildWaveform(`${trackKey}-v3`, 30),
  }
  return [original, v1, v2, v3]
}

const getDefaultClipLayout = (blockIndex: number) => ({
  left: blockIndex === 0 ? 2 : 42 + (blockIndex - 1) * 24,
  width: blockIndex === 0 ? 38 : 22,
})

const getIssuePalette = (type: ProofreadIssueType) => {
  if (type === 'misread') return { badge: '🔴 错音', badgeClass: 'border-red-300/70 bg-red-50 text-red-700' }
  if (type === 'plosive') return { badge: '🟠 爆破音', badgeClass: 'border-orange-300/70 bg-orange-50 text-orange-700' }
  return { badge: '🟡 杂音', badgeClass: 'border-yellow-300/70 bg-yellow-50 text-yellow-700' }
}

const buildProofreadIssues = (material: MaterialTab | undefined, hasCopy: boolean): ProofreadIssue[] => {
  if (!material) return []
  const voiceTracks = material.tracks.filter((row) => getTrackMeta(row.name).type === 'voice')
  const mainTrack = voiceTracks[0] ?? material.tracks.find((row) => getTrackMeta(row.name).type !== 'video')
  if (!mainTrack || mainTrack.blocks.length === 0) return []
  const firstBlock = mainTrack.blocks[0]
  const issues: ProofreadIssue[] = [
    { id: `${material.id}-noise-1`, type: 'noise', trackName: mainTrack.name, blockName: firstBlock, timeLabel: '00:06.8', clipProgress: 24, title: '明显口水音' },
    { id: `${material.id}-plosive-1`, type: 'plosive', trackName: mainTrack.name, blockName: firstBlock, timeLabel: '00:18.2', clipProgress: 56, title: '喷麦' },
  ]
  if (hasCopy) {
    issues.splice(1, 0, {
      id: `${material.id}-misread-1`,
      type: 'misread',
      trackName: mainTrack.name,
      blockName: firstBlock,
      timeLabel: '00:12.4',
      clipProgress: 41,
      title: '错读字词',
      originalText: '角色',
      detectedText: '脚色',
    })
  }
  return issues
}

export default function App() {
  const [assetTab, setAssetTab] = useState<AssetTab>('sfx')
  const [myAssetCategory, setMyAssetCategory] = useState<MyAssetCategory>('all')
  const [uploadCategory, setUploadCategory] = useState<MyAssetCategory>('all')
  const [uploadPanelOpen, setUploadPanelOpen] = useState(true)
  const [materialTabs, setMaterialTabs] = useState<MaterialTab[]>(initialMaterialTabs)
  const [activeMaterialId, setActiveMaterialId] = useState(initialMaterialTabs[0].id)
  const [selectedTrackKey, setSelectedTrackKey] = useState(
    `${initialMaterialTabs[0].id}::${initialMaterialTabs[0].tracks[0].name}`,
  )
  const [curatedQuery, setCuratedQuery] = useState<Record<LibraryFilterTab, string>>({ sfx: '', music: '' })
  const [selectedCuratedTags, setSelectedCuratedTags] = useState<Record<LibraryFilterTab, string[]>>({
    sfx: [],
    music: [],
  })
  const [toneQuery, setToneQuery] = useState('')
  const [selectedToneTags, setSelectedToneTags] = useState<string[]>([])
  const [tuningTab, setTuningTab] = useState<'basic' | 'tone' | 'speed'>('basic')
  const [selectedToneByTrack, setSelectedToneByTrack] = useState<Record<string, string>>({})
  const [speechRateByTrack, setSpeechRateByTrack] = useState<Record<string, number>>({})
  const [analysisPanelMode, setAnalysisPanelMode] = useState<'assistant' | 'proofread'>('assistant')
  const [proofreadStatus, setProofreadStatus] = useState<ProofreadStatus>('idle')
  const [proofreadProgress, setProofreadProgress] = useState(0)
  const [proofreadHasCopy, setProofreadHasCopy] = useState<boolean | null>(null)
  const [proofreadIssues, setProofreadIssues] = useState<ProofreadIssue[]>([])
  const [proofreadPanelOpen, setProofreadPanelOpen] = useState(false)
  const [proofreadDoneTipVisible, setProofreadDoneTipVisible] = useState(false)
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)
  const [focusedIssueId, setFocusedIssueId] = useState('')
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([])
  const [assistantThinking, setAssistantThinking] = useState(false)
  const [assistantThinkingStep, setAssistantThinkingStep] = useState(0)
  const [assistantRangeLabel, setAssistantRangeLabel] = useState('01:10 - 01:45')
  const [assetLogs, setAssetLogs] = useState(aiLogs)
  const [createChannel, setCreateChannel] = useState<CreateChannel>('sfx')
  const [createInputs, setCreateInputs] = useState<Record<CreateChannel, string>>({ sfx: '', music: '', voice: '' })
  const [createGeneratingByChannel, setCreateGeneratingByChannel] = useState<Record<CreateChannel, boolean>>({
    sfx: false,
    music: false,
    voice: false,
  })
  const [createElapsedByChannel, setCreateElapsedByChannel] = useState<Record<CreateChannel, number>>({
    sfx: 0,
    music: 0,
    voice: 0,
  })
  const [createResultByChannel, setCreateResultByChannel] = useState<Record<CreateChannel, string>>({
    sfx: '',
    music: '',
    voice: '',
  })
  const [uploadedAssets, setUploadedAssets] = useState<MyAsset[]>(initialMyAssets)
  const [clipContextMenu, setClipContextMenu] = useState<ClipContextMenuState | null>(null)
  const [selectedClipKey, setSelectedClipKey] = useState('')
  const [clipPlayback, setClipPlayback] = useState<ClipPlaybackState>({ clipKey: '', progress: 0, running: false })
  const [trackVersionsByTrack, setTrackVersionsByTrack] = useState<Record<string, TrackVersion[]>>({})
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareSource, setCompareSource] = useState<'current' | 'history'>('current')
  const [compareHistoryId, setCompareHistoryId] = useState('')
  const [comparePlayback, setComparePlayback] = useState<ComparePlaybackState>({
    progress: 0,
    running: false,
    targetId: '',
  })
  const [clonedVoiceItems, setClonedVoiceItems] = useState<string[]>(initialClonedVoices)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [cloneMethod, setCloneMethod] = useState<'record' | 'upload'>('record')
  const [cloneNameInput, setCloneNameInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [uploadedAudioName, setUploadedAudioName] = useState('')
  const activeMaterial = materialTabs.find((tab) => tab.id === activeMaterialId)
  const selectedTrackName = selectedTrackKey.split('::')[1]
  const selectedTrack = activeMaterial?.tracks.find((track) => track.name === selectedTrackName) ?? activeMaterial?.tracks[0]
  const selectedTuning = selectedTrack ? getTrackTuning(selectedTrack.name) : null
  const trackVersions = selectedTrackKey ? trackVersionsByTrack[selectedTrackKey] ?? [] : []
  const originalVersion = trackVersions.find((version) => version.kind === 'original')
  const appliedVersions = trackVersions.filter((version) => version.kind === 'applied')
  const latestAppliedVersion = appliedVersions.at(-1)
  const previousAppliedVersions = appliedVersions.slice(0, -1)
  const latestVersionForCompare = latestAppliedVersion ?? originalVersion
  const compareTargetVersion =
    compareSource === 'current'
      ? latestVersionForCompare
      : previousAppliedVersions.find((version) => version.id === compareHistoryId) ?? previousAppliedVersions.at(-1)
  const toneOptions = Array.from(new Set([...clonedVoiceItems, ...curatedVoices.map((asset) => asset.name)]))
  const activeTone = selectedTrackKey ? selectedToneByTrack[selectedTrackKey] ?? toneOptions[0] : toneOptions[0]
  const activeSpeechRate = selectedTrackKey ? speechRateByTrack[selectedTrackKey] ?? 1 : 1
  const filteredCuratedVoices = filterCuratedAssets(curatedVoices, toneQuery, selectedToneTags)
  const filteredCuratedSfx = filterCuratedAssets(curatedSfx, curatedQuery.sfx, selectedCuratedTags.sfx)
  const filteredCuratedMusic = filterCuratedAssets(curatedMusic, curatedQuery.music, selectedCuratedTags.music)
  const myCollectionAssets: MyAsset[] = [
    ...mySfx.map((name) => ({ name, type: 'sfx' as const, source: '收藏' as const, aiTags: [] })),
    ...myMusic.map((name) => ({ name, type: 'music' as const, source: '收藏' as const, aiTags: [] })),
    ...uploadedAssets,
  ]
  const filteredMyAssets = myCollectionAssets.filter((asset) => myAssetCategory === 'all' || asset.type === myAssetCategory)
  const filteredUploadedAssets = uploadedAssets.filter((asset) => uploadCategory === 'all' || asset.type === uploadCategory)
  const createInput = createInputs[createChannel]
  const createGenerating = createGeneratingByChannel[createChannel]
  const createElapsed = createElapsedByChannel[createChannel]
  const createResult = createResultByChannel[createChannel]
  const focusedIssue = proofreadIssues.find((issue) => issue.id === focusedIssueId)
  const assistantFocusLabel = selectedTrack
    ? `${selectedTrack.name} [${assistantRangeLabel}]`
    : `人声轨 1 [${assistantRangeLabel}]`
  const assistantThinkingSteps = [
    '正在分析文本语义：[温暖/美好/讲述]',
    '正在分析当前人声：[音调偏高/语速偏快/冷硬]',
    '正在检查同期背景轨：[当前无 BGM]',
  ]
  const curatedVoiceTags = getCuratedTags(curatedVoices)
  const curatedSfxTags = getCuratedTags(curatedSfx)
  const curatedMusicTags = getCuratedTags(curatedMusic)

  useEffect(() => {
    if (!activeMaterial || activeMaterial.tracks.length === 0) return
    const currentTrackName = selectedTrackKey.split('::')[1]
    const exists = activeMaterial.tracks.some((track) => track.name === currentTrackName)
    if (!exists || !selectedTrackKey.startsWith(`${activeMaterial.id}::`)) {
      setSelectedTrackKey(`${activeMaterial.id}::${activeMaterial.tracks[0].name}`)
    }
  }, [activeMaterial, selectedTrackKey])

  useEffect(() => {
    if (!selectedTrackKey || !selectedTrack) return
    setTrackVersionsByTrack((prev) => {
      if (prev[selectedTrackKey]) return prev
      return { ...prev, [selectedTrackKey]: buildDefaultTrackVersions(selectedTrackKey) }
    })
  }, [selectedTrackKey, selectedTrack])

  useEffect(() => {
    if (!compareOpen) return
    if (compareSource === 'history') {
      if (previousAppliedVersions.length === 0) {
        setCompareSource('current')
        setCompareHistoryId('')
        return
      }
      const exists = previousAppliedVersions.some((version) => version.id === compareHistoryId)
      if (!exists) setCompareHistoryId(previousAppliedVersions.at(-1)?.id ?? '')
    } else {
      setCompareHistoryId('')
    }
  }, [compareOpen, compareSource, compareHistoryId, previousAppliedVersions])

  useEffect(() => {
    if (!compareOpen || !compareTargetVersion) {
      setComparePlayback((prev) => ({ ...prev, running: false }))
      return
    }
    setComparePlayback({ progress: 0, running: true, targetId: compareTargetVersion.id })
  }, [compareOpen, compareSource, compareHistoryId, compareTargetVersion?.id])

  useEffect(() => {
    if (!comparePlayback.running) return
    const timer = setInterval(() => {
      setComparePlayback((prev) => {
        const next = prev.progress + 2.4
        if (next >= 100) return { ...prev, progress: 100, running: false }
        return { ...prev, progress: next }
      })
    }, 45)
    return () => clearInterval(timer)
  }, [comparePlayback.running])

  useEffect(() => {
    if (proofreadStatus !== 'running') return
    const timer = setInterval(() => {
      setProofreadProgress((prev) => {
        const next = Math.min(prev + 5, 100)
        if (next === 100) {
          clearInterval(timer)
          const issues = buildProofreadIssues(activeMaterial, Boolean(proofreadHasCopy))
          setProofreadIssues(issues)
          setProofreadPanelOpen(true)
          setProofreadStatus('done')
          setFocusedIssueId(issues[0]?.id ?? '')
        }
        return next
      })
    }, 160)
    return () => clearInterval(timer)
  }, [proofreadStatus, activeMaterial, proofreadHasCopy])

  useEffect(() => {
    if (proofreadIssues.length > 0 || proofreadStatus !== 'done') return
    setProofreadDoneTipVisible(true)
    const timer = setTimeout(() => {
      setProofreadDoneTipVisible(false)
      setProofreadPanelOpen(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [proofreadIssues.length, proofreadStatus])

  useEffect(() => {
    if (!isRecording) return
    const timer = setInterval(() => {
      setRecordSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isRecording])

  useEffect(() => {
    if (!clipContextMenu) return
    const closeMenu = () => setClipContextMenu(null)
    window.addEventListener('click', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [clipContextMenu])

  useEffect(() => {
    if (!clipPlayback.running) return
    const timer = setInterval(() => {
      setClipPlayback((prev) => {
        const next = prev.progress + 2.5
        if (next >= 100) {
          return { ...prev, progress: 100, running: false }
        }
        return { ...prev, progress: next }
      })
    }, 40)
    return () => clearInterval(timer)
  }, [clipPlayback.running])

  useEffect(() => {
    if (!assistantThinking) return
    const timer = setInterval(() => {
      setAssistantThinkingStep((prev) => (prev >= assistantThinkingSteps.length ? prev : prev + 1))
    }, 420)
    return () => clearInterval(timer)
  }, [assistantThinking, assistantThinkingSteps.length])

  useEffect(() => {
    if (!createGenerating) return
    const timer = setInterval(() => {
      setCreateElapsedByChannel((prev) => ({ ...prev, [createChannel]: prev[createChannel] + 1 }))
    }, 1000)
    return () => clearInterval(timer)
  }, [createGenerating, createChannel])

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

  const splitActiveMaterial = () => {
    if (!activeMaterial) return
    setMaterialTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeMaterial.id) return tab
        if (tab.split) return tab
        return {
          ...tab,
          split: true,
          tracks: buildSplitTracks(tab.title),
        }
      }),
    )
    setSelectedTrackKey(`${activeMaterial.id}::视频`)
    setAssetLogs((prev) => [`拆轨完成：素材「${activeMaterial.title}」已拆分为视频/人声/音效/背景音轨。`, ...prev])
  }

  const toggleCuratedTag = (tab: LibraryFilterTab, tag: string) => {
    setSelectedCuratedTags((prev) => {
      const exists = prev[tab].includes(tag)
      return {
        ...prev,
        [tab]: exists ? prev[tab].filter((item) => item !== tag) : [...prev[tab], tag],
      }
    })
  }

  const clearCuratedFilter = (tab: LibraryFilterTab) => {
    setCuratedQuery((prev) => ({ ...prev, [tab]: '' }))
    setSelectedCuratedTags((prev) => ({ ...prev, [tab]: [] }))
  }

  const toggleToneTag = (tag: string) => {
    setSelectedToneTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]))
  }

  const clearToneFilter = () => {
    setToneQuery('')
    setSelectedToneTags([])
  }

  const setToneForCurrentTrack = (tone: string) => {
    if (!selectedTrackKey) return
    setSelectedToneByTrack((prev) => ({ ...prev, [selectedTrackKey]: tone }))
  }

  const setSpeechRateForCurrentTrack = (rate: number) => {
    if (!selectedTrackKey) return
    setSpeechRateByTrack((prev) => ({ ...prev, [selectedTrackKey]: rate }))
  }

  const sendCreatePrompt = () => {
    const text = createInputs[createChannel].trim()
    if (!text || createGenerating) return
    setCreateGeneratingByChannel((prev) => ({ ...prev, [createChannel]: true }))
    setCreateElapsedByChannel((prev) => ({ ...prev, [createChannel]: 0 }))
    setCreateResultByChannel((prev) => ({ ...prev, [createChannel]: '' }))
    window.setTimeout(() => {
      const channelName = createChannelLabel[createChannel]
      setCreateGeneratingByChannel((prev) => ({ ...prev, [createChannel]: false }))
      setCreateElapsedByChannel((prev) => ({ ...prev, [createChannel]: 2 }))
      setCreateResultByChannel((prev) => ({
        ...prev,
        [createChannel]: `${channelName}创作完成：基于“${text}”已生成 4 个候选版本（标准版/轻量版/强化版/情绪版）`,
      }))
      setAssetLogs((prev) => [`AI创作完成：${channelName}耗时 2s`, ...prev])
    }, 2400)
  }

  const beginBasicProofread = (hasCopy: boolean) => {
    setProofreadHasCopy(hasCopy)
    setProofreadStatus('running')
    setProofreadProgress(0)
    setProofreadIssues([])
    setProofreadPanelOpen(false)
    setProofreadDoneTipVisible(false)
    setFocusedIssueId('')
  }

  const startBasicProofread = () => {
    if (proofreadStatus === 'running') return
    setCopyConfirmOpen(true)
  }

  const focusIssue = (issue: ProofreadIssue) => {
    if (!activeMaterial) return
    setFocusedIssueId(issue.id)
    setSelectedTrackKey(`${activeMaterial.id}::${issue.trackName}`)
    setAssistantRangeLabel(`${issue.timeLabel} - ${issue.timeLabel}`)
  }

  const resolveIssue = (issue: ProofreadIssue, actionLabel: string) => {
    setAssetLogs((prev) => [`基础校对处理：${issue.title}（${issue.timeLabel}）-> ${actionLabel}`, ...prev])
    setProofreadIssues((prev) => prev.filter((item) => item.id !== issue.id))
    if (focusedIssueId === issue.id) setFocusedIssueId('')
  }

  const pushAssistantReply = (userText: string) => {
    const lower = userText.toLowerCase()
    if (lower.includes('盖住') || lower.includes('听不清')) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: '明白了。先做自动闪避，确保人声可懂度，再微调BGM电平。',
          cards: [{ id: 'ducking', kind: 'ducking', title: '建议：人声闪避 (Auto-Ducking)', description: '避免BGM遮盖人声。' }],
        },
      ])
      return
    }
    setAssistantMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: '收到。当前人声语速偏快且偏冷硬，和“温暖讲述”不完全匹配，建议先补氛围再调人声质感。',
        cards: [
          { id: 'bgm', kind: 'bgm', title: '建议一：垫入情绪 BGM', description: '推荐 3 首温暖讲述类配乐。' },
          { id: 'eq', kind: 'eq', title: '建议二：应用温暖讲述 EQ', description: '降低亮度、增强低频共鸣。' },
          { id: 'regen', kind: 'regenerate', title: '建议三：重生成/标记重录', description: '从源头修复语速语气。' },
        ],
      },
    ])
  }

  const submitAssistantMessage = (presetText?: string) => {
    const text = (presetText ?? assistantInput).trim()
    if (!text || assistantThinking) return
    setAssistantMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', text }])
    setAssistantInput('')
    setAssistantThinking(true)
    setAssistantThinkingStep(0)
    window.setTimeout(() => {
      setAssistantThinking(false)
      setAssistantThinkingStep(assistantThinkingSteps.length)
      pushAssistantReply(text)
    }, 1200)
  }

  const onAssistantCardAction = (kind: AssistantCardKind, action: string) => {
    setAssetLogs((prev) => [`AI助手：已执行 ${action}`, ...prev])
    setAssistantMessages((prev) => [...prev, { id: `assistant-action-${Date.now()}`, role: 'assistant', text: `已执行：${action}` }])
    if (kind === 'bgm') return
  }

  const openCloneDialog = () => {
    setCloneDialogOpen(true)
    setCloneMethod('record')
    setCloneNameInput('')
    setIsRecording(false)
    setRecordSeconds(0)
    setUploadedAudioName('')
  }

  const closeCloneDialog = () => {
    setCloneDialogOpen(false)
    setIsRecording(false)
  }

  const submitClone = () => {
    const name = cloneNameInput.trim()
    if (!name) return
    const ready = cloneMethod === 'record' ? recordSeconds >= 3 : Boolean(uploadedAudioName)
    if (!ready) return
    setClonedVoiceItems((prev) => (prev.includes(name) ? prev : [name, ...prev]))
    if (selectedTrackKey) {
      setSelectedToneByTrack((prev) => ({ ...prev, [selectedTrackKey]: name }))
    }
    closeCloneDialog()
  }

  const importClipAsAsset = () => {
    if (!clipContextMenu) return
    const { blockName, trackName, assetType } = clipContextMenu
    const aiTags = buildAiTags(assetType, blockName)
    const existingCount = uploadedAssets.filter((asset) => asset.type === assetType && asset.name.startsWith(blockName)).length
    const name = existingCount === 0 ? blockName : `${blockName}-${existingCount + 1}`
    const nextAsset: MyAsset = { name, type: assetType, source: '轨道导入', aiTags }
    setUploadedAssets((prev) => [nextAsset, ...prev])
    setAssetTab('my_assets')
    setUploadPanelOpen(true)
    setUploadCategory(assetType)
    setAssetLogs((prev) => [
      `资产导入：已从${trackName}片段「${blockName}」导入到${assetType === 'sfx' ? '音效资产' : '音乐资产'}（AI标签：${aiTags.join(' / ')}）`,
      ...prev,
    ])
    setClipContextMenu(null)
  }

  const applyCurrentTuning = () => {
    if (!selectedTrack || !selectedTuning) return
    const summary =
      tuningTab === 'tone'
        ? `音色=${activeTone}`
        : tuningTab === 'speed'
          ? `语速=${activeSpeechRate.toFixed(2)}x`
          : `${selectedTuning.controls
              .slice(0, 2)
              .map((control) => `${control.label}${control.amount}`)
              .join('，')}`
    const strength = tuningTab === 'tone' ? 9 : tuningTab === 'speed' ? Math.round((activeSpeechRate - 1) * 20) : 6
    const versionId = `${Date.now()}`
    const nextVersion: TrackVersion = {
      id: versionId,
      label: `版本 ${appliedVersions.length + 1}`,
      summary,
      kind: 'applied',
      waveform: buildWaveform(`${selectedTrackKey}-${versionId}`, strength),
    }
    setTrackVersionsByTrack((prev) => {
      const current = prev[selectedTrackKey] ?? buildDefaultTrackVersions(selectedTrackKey)
      return { ...prev, [selectedTrackKey]: [...current, nextVersion] }
    })
    setCompareOpen(false)
    setCompareSource('current')
    setCompareHistoryId('')
    setAssetLogs((prev) => [`精调应用：${selectedTrack.name} 已应用参数（${summary}）`, ...prev])
    const fallbackBlock = selectedTrack.blocks[0]
    const targetClipKey =
      selectedClipKey || (activeMaterial && fallbackBlock ? `${activeMaterial.id}::${selectedTrack.name}::${fallbackBlock}` : '')
    if (!targetClipKey) return
    setSelectedClipKey(targetClipKey)
    setClipPlayback({ clipKey: targetClipKey, progress: 0, running: true })
  }

  const activePlayheadPercent = (() => {
    if (!activeMaterial || !clipPlayback.clipKey) return 0
    const parts = clipPlayback.clipKey.split('::')
    if (parts.length < 3) return 0
    const [, trackName, ...blockParts] = parts
    const blockName = blockParts.join('::')
    const track = activeMaterial.tracks.find((row) => row.name === trackName)
    if (!track) return 0
    const blockIndex = track.blocks.findIndex((block) => block === blockName)
    if (blockIndex < 0) return 0
    const layout = getDefaultClipLayout(blockIndex)
    return layout.left + (layout.width * clipPlayback.progress) / 100
  })()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,var(--primary)_16%,transparent),transparent_42%)] p-2 text-foreground md:p-3">
      <div className="mx-auto max-w-[1700px] overflow-hidden rounded-lg border border-border/70 bg-background/95">
        <header className="border-b border-border/70 px-3 py-2 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-base font-semibold">S.A.E音频编辑</h1>
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

        <section className="grid gap-0 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          <aside className="space-y-0 p-2 xl:border-r xl:border-border/70">
            <section className="pb-2">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">资产管理</h2>
              </div>
              <div className="mb-2 grid grid-cols-4 gap-1 text-[11px]">
                {[
                  ['sfx', '音效资产'],
                  ['music', '音乐资产'],
                  ['my_assets', '我的资产'],
                  ['ai_create', 'AI创作'],
                ].map(([key, label]) => {
                  const active = assetTab === key
                  return (
                    <button
                      key={key}
                      onClick={() => setAssetTab(key as AssetTab)}
                      className={`whitespace-nowrap rounded-md border px-1.5 py-1 transition ${active
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent/60'
                        }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {assetTab === 'my_assets' && (
                <div className="space-y-2 text-xs">

                  <div className="border-t border-border/70 pt-2">
                    <div className="mb-1.5 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-muted-foreground">我的上传</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{filteredUploadedAssets.length} 条</span>
                        <button
                          onClick={() => setUploadPanelOpen((prev) => !prev)}
                          className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          {uploadPanelOpen ? '收起' : '展开'}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5 text-left text-[11px] text-primary">
                        上传音效
                      </button>
                      <button className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5 text-left text-[11px] text-primary">
                        上传音乐
                      </button>
                    </div>
                    {uploadPanelOpen && (
                      <div className="mt-1.5 space-y-1.5">
                        <div className="flex gap-1">
                          {[
                            ['all', '全部'],
                            ['sfx', '音效'],
                            ['music', '音乐'],
                          ].map(([key, label]) => {
                            const active = uploadCategory === key
                            return (
                              <button
                                key={key}
                                onClick={() => setUploadCategory(key as MyAssetCategory)}
                                className={`rounded-md border px-2 py-1 text-[11px] ${active
                                    ? 'border-primary/40 bg-primary/15 text-primary'
                                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                  }`}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                        <div className="space-y-1">
                          {filteredUploadedAssets.map((asset) => (
                            <article
                              key={`upload-${asset.type}-${asset.name}`}
                              className="rounded-md border border-border bg-background/60 px-2 py-1.5"
                            >
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <p className="truncate pr-2 text-[11px] font-medium">{asset.name}</p>
                                <span className="shrink-0 text-[10px] text-primary">
                                  {asset.type === 'sfx' ? '音效' : '音乐'}·{asset.source}
                                </span>
                              </div>
                              {asset.aiTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {asset.aiTags.map((tag) => (
                                    <span
                                      key={`${asset.name}-${tag}`}
                                      className="rounded border border-primary/25 bg-primary/10 px-1 py-0.5 text-[10px] text-primary"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-muted-foreground">我的收藏</h3>
                    <span className="text-[10px] text-muted-foreground">{filteredMyAssets.length} 条</span>
                  </div>
                  <div className="flex gap-1">
                    {[
                      ['all', '全部'],
                      ['sfx', '音效'],
                      ['music', '音乐'],
                    ].map(([key, label]) => {
                      const active = myAssetCategory === key
                      return (
                        <button
                          key={key}
                          onClick={() => setMyAssetCategory(key as MyAssetCategory)}
                          className={`rounded-md border px-2 py-1 text-[11px] ${active
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredMyAssets.map((asset) => (
                      <article
                        key={`${asset.type}-${asset.name}`}
                        className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2"
                      >
                        <div className="h-8 w-8 shrink-0 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium">{asset.name}</p>
                          <p className="text-[10px] text-primary">{asset.type === 'sfx' ? '音效' : '音乐'} · {asset.source}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {assetTab === 'sfx' && (
                <div className="space-y-2 text-xs">
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">优质音效库</h3>
                    <div className="mb-1.5 rounded-md border border-border bg-background/70 p-1.5">
                      <p className="mb-1 text-[10px] text-muted-foreground">支持自然语言搜索</p>
                      <div className="flex items-center gap-1.5">
                        <input
                          value={curatedQuery.sfx}
                          onChange={(event) => setCuratedQuery((prev) => ({ ...prev, sfx: event.target.value }))}
                          placeholder="AI关键词搜索：赛博 冲击 转场"
                          className="h-7 w-full rounded-md border border-border bg-card px-2 text-[11px] text-foreground outline-none focus:border-primary/40"
                        />
                        {(curatedQuery.sfx || selectedCuratedTags.sfx.length > 0) && (
                          <button
                            onClick={() => clearCuratedFilter('sfx')}
                            className="h-7 shrink-0 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            清除
                          </button>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {curatedSfxTags.map((tag) => {
                          const active = selectedCuratedTags.sfx.includes(tag)
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleCuratedTag('sfx', tag)}
                              className={`rounded-md border px-1.5 py-0.5 text-[10px] ${active
                                  ? 'border-primary/40 bg-primary/15 text-primary'
                                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                            >
                              {tag}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredCuratedSfx.map((asset) => (
                        <article
                          key={asset.name}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2 transition hover:border-primary/40"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{asset.name}</p>
                            <p className="text-[10px] text-primary">智作优选</p>
                          </div>
                        </article>
                      ))}
                      {filteredCuratedSfx.length === 0 && (
                        <p className="col-span-2 rounded-md border border-dashed border-border bg-background/70 p-2 text-[11px] text-muted-foreground">
                          未命中音效结果，尝试更换关键词或减少标签。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {assetTab === 'music' && (
                <div className="space-y-2 text-xs">
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">优质音乐库</h3>
                    <div className="mb-1.5 rounded-md border border-border bg-background/70 p-1.5">
                      <p className="mb-1 text-[10px] text-muted-foreground">支持自然语言搜索</p>
                      <div className="flex items-center gap-1.5">
                        <input
                          value={curatedQuery.music}
                          onChange={(event) => setCuratedQuery((prev) => ({ ...prev, music: event.target.value }))}
                          placeholder="AI关键词搜索：悬疑 节奏 电影"
                          className="h-7 w-full rounded-md border border-border bg-card px-2 text-[11px] text-foreground outline-none focus:border-primary/40"
                        />
                        {(curatedQuery.music || selectedCuratedTags.music.length > 0) && (
                          <button
                            onClick={() => clearCuratedFilter('music')}
                            className="h-7 shrink-0 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            清除
                          </button>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {curatedMusicTags.map((tag) => {
                          const active = selectedCuratedTags.music.includes(tag)
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleCuratedTag('music', tag)}
                              className={`rounded-md border px-1.5 py-0.5 text-[10px] ${active
                                  ? 'border-primary/40 bg-primary/15 text-primary'
                                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                            >
                              {tag}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredCuratedMusic.map((asset) => (
                        <article
                          key={asset.name}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2 transition hover:border-primary/40"
                        >
                          <div className="h-10 w-10 shrink-0 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{asset.name}</p>
                            <p className="text-[10px] text-primary">智作优选</p>
                          </div>
                        </article>
                      ))}
                      {filteredCuratedMusic.length === 0 && (
                        <p className="col-span-2 rounded-md border border-dashed border-border bg-background/70 p-2 text-[11px] text-muted-foreground">
                          未命中音乐结果，尝试更换关键词或减少标签。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {assetTab === 'ai_create' && (
                <div className="space-y-2 text-xs">
                  <div className="flex gap-1">
                    {[
                      ['sfx', '音效'],
                      ['music', '音乐'],
                      ['voice', '人声'],
                    ].map(([key, label]) => {
                      const active = createChannel === key
                      return (
                        <button
                          key={key}
                          onClick={() => setCreateChannel(key as CreateChannel)}
                          className={`rounded-md border px-2 py-1 text-[11px] ${
                            active
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="rounded-md border border-border bg-background/70 p-2">
                    <p className="mb-1 text-[10px] text-muted-foreground">当前创作类型：{createChannelLabel[createChannel]}</p>
                    <textarea
                        value={createInput}
                        onChange={(event) =>
                          setCreateInputs((prev) => ({ ...prev, [createChannel]: event.target.value }))
                        }
                        placeholder="请描述你的想法"
                        className="h-24 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[11px] outline-none focus:border-primary/40"
                      />
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">
                        {createGenerating ? `生成中... 已耗时 ${createElapsed}s` : createResult ? `生成完成 · 用时 ${createElapsed}s` : '输入想法后点击生成'}
                      </p>
                      <button
                        onClick={sendCreatePrompt}
                        disabled={!createInput.trim() || createGenerating}
                        className={`rounded-md border px-2 text-[11px] ${
                          createInput.trim() && !createGenerating
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        生成
                      </button>
                    </div>
                    {createResult && (
                      <p className="mt-1.5 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] text-primary">{createResult}</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="border-t border-border/70 pt-2">
              <div className="mb-1.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold">AI 操作日志</h2>
              </div>
              <div className="space-y-1.5">
                {assetLogs.map((log, index) => (
                  <article
                    key={`${index}-${log}`}
                    className="group rounded-md border border-border bg-background/70 px-2 py-1.5 text-[11px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="pr-2">{log}</p>
                      <div className="hidden shrink-0 gap-1 group-hover:flex group-focus-within:flex">
                        <button className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px]">
                          试听
                        </button>
                        <button className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          应用当前版本
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </aside>

          <section className="space-y-0 p-2 xl:border-r xl:border-border/70">
            <div className="border-b border-border/70 pb-2">
              <div className="mb-1.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold">预览区</h2>
                <div className="flex gap-2 text-xs">
                  <button onClick={splitActiveMaterial} className="rounded-md border border-border bg-background px-2 py-1">
                    拆轨
                  </button>
                </div>
              </div>
              <div className="grid min-h-[240px] place-items-center rounded-lg border border-dashed border-border bg-[linear-gradient(120deg,color-mix(in_oklch,var(--muted)_70%,transparent),transparent)] text-center">
                <div>
                  <p className="text-sm font-medium">视频预览展示区</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activeMaterial ? `当前素材：${activeMaterial.title}` : '请在下方导入并选择视频素材'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="mb-1.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold">专业级多轨界面</h2>
                <div className="flex gap-2 text-xs">
                  <button className="rounded-md border border-border px-2 py-1">对比</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {materialTabs.map((tab) => {
                    const active = tab.id === activeMaterialId
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveMaterialId(tab.id)}
                        className={`flex shrink-0 items-center gap-2 rounded-md border px-2 py-1 text-xs ${active
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
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 z-30 w-[2px] bg-black/75"
                        style={{ left: `calc(160px + (100% - 160px) * ${activePlayheadPercent / 100})` }}
                      />
                      {activeMaterial.tracks.map((row) => {
                        const meta = getTrackMeta(row.name)
                        const isAudio = meta.type !== 'video'
                        const selected = selectedTrack?.name === row.name
                        return (
                          <div
                            key={`${activeMaterial.id}-${row.name}`}
                            onClick={() => setSelectedTrackKey(`${activeMaterial.id}::${row.name}`)}
                            className={`grid cursor-pointer grid-cols-[160px_minmax(0,1fr)] border-b border-border/70 transition last:border-b-0 ${selected ? 'bg-primary/5' : ''
                              }`}
                          >
                            <div
                              className={`flex items-center gap-2 px-2 py-2 text-xs text-foreground ${selected ? 'bg-primary/10' : 'bg-muted/30'
                                }`}
                            >
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
                            <div className="relative overflow-hidden bg-background p-1.5">
                              <div className="absolute inset-0 bg-[repeating-linear-gradient(to_right,transparent_0,transparent_95px,rgba(0,0,0,0.05)_96px)]" />
                              <div className="relative flex min-h-12 items-center gap-2">
                                {row.blocks.map((block, blockIndex) => {
                                  const clipKey = `${activeMaterial.id}::${row.name}::${block}`
                                  const clipSelected = selectedClipKey === clipKey
                                  return (
                                    <span
                                      key={block}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setSelectedClipKey(clipKey)
                                      }}
                                      onContextMenu={(event) => {
                                        if (!(meta.type === 'sfx' || meta.type === 'bgm')) return
                                        event.preventDefault()
                                        event.stopPropagation()
                                        setSelectedClipKey(clipKey)
                                        setSelectedTrackKey(`${activeMaterial.id}::${row.name}`)
                                        setClipContextMenu({
                                          x: event.clientX,
                                          y: event.clientY,
                                          materialId: activeMaterial.id,
                                          trackName: row.name,
                                          blockName: block,
                                          assetType: meta.type === 'sfx' ? 'sfx' : 'music',
                                        })
                                      }}
                                      className={`group relative overflow-hidden rounded-md border px-2 py-1 text-[11px] ${isAudio
                                          ? 'border-sky-300/80 bg-sky-100 text-sky-900'
                                          : 'border-cyan-300/80 bg-cyan-100 text-cyan-900'
                                        } ${clipSelected ? 'ring-2 ring-primary/35' : ''}`}
                                      style={{ width: `${blockIndex === 0 ? 38 : 22}%` }}
                                    >
                                      <span className="relative z-10 truncate">{block}</span>
                                      {isAudio && (
                                        <span className="pointer-events-none absolute inset-0 opacity-35 [background:repeating-linear-gradient(90deg,transparent_0,transparent_6px,rgba(2,132,199,.45)_6px,rgba(2,132,199,.45)_8px)]" />
                                      )}
                                    </span>
                                  )
                                })}
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

          <aside className="space-y-0 p-2">
            <section className="pb-2">
              <div className="mb-1.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold">AI 智能分析面板</h2>
                {proofreadDoneTipVisible && (
                  <span className="rounded-md border border-emerald-300/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                    🎉 已完成所有基础校对
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <button
                    onClick={() => setAnalysisPanelMode('assistant')}
                    className={`rounded-md border px-2 py-1.5 ${
                      analysisPanelMode === 'assistant'
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    AI交互助手
                  </button>
                  <button
                    onClick={() => setAnalysisPanelMode('proofread')}
                    className={`rounded-md border px-2 py-1.5 ${
                      analysisPanelMode === 'proofread'
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    基础校对
                  </button>
                </div>

                {analysisPanelMode === 'assistant' ? (
                  <div className="space-y-2 rounded-md border border-border bg-background/70 p-2">
                    <div className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5 text-[11px] text-primary">
                      当前正在分析：{assistantFocusLabel}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {assistantQuickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => submitAssistantMessage(prompt)}
                          className="rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-md border border-border bg-card/60 p-2">
                      {assistantMessages.length === 0 && !assistantThinking && (
                        <p className="text-[11px] text-muted-foreground">从上方快捷问题开始，或直接输入你的“感觉描述”。</p>
                      )}
                      {assistantMessages.map((message) => (
                        <article
                          key={message.id}
                          className={`rounded-md border p-2 text-[11px] ${
                            message.role === 'user'
                              ? 'ml-6 border-primary/30 bg-primary/10 text-foreground'
                              : 'mr-6 border-border bg-background text-foreground'
                          }`}
                        >
                          <p className="mb-1 text-[10px] text-muted-foreground">{message.role === 'user' ? '你' : 'AI'}</p>
                          <p>{message.text}</p>
                          {message.cards && (
                            <div className="mt-2 space-y-1.5">
                              {message.cards.map((card) => (
                                <div key={card.id} className="rounded-md border border-border bg-card p-2">
                                  <p className="text-[11px] font-medium">{card.title}</p>
                                  <p className="mt-0.5 text-[10px] text-muted-foreground">{card.description}</p>
                                  {card.kind === 'bgm' && (
                                    <div className="mt-1.5 space-y-1">
                                      {warmBgmCandidates.map((name) => (
                                        <div key={name} className="flex items-center justify-between rounded border border-border bg-background px-1.5 py-1">
                                          <button onClick={() => onAssistantCardAction('bgm', `试听 ${name}`)} className="rounded-md border border-border px-1.5 py-0.5 text-[10px]">
                                            ▶ 试听
                                          </button>
                                          <span className="truncate px-2 text-[10px]">{name}</span>
                                        </div>
                                      ))}
                                      <button onClick={() => onAssistantCardAction('bgm', '一键添加到新轨道')} className="w-full rounded-md border border-primary/30 bg-primary/10 px-1.5 py-1 text-[10px] text-primary">
                                        一键添加到新轨道
                                      </button>
                                    </div>
                                  )}
                                  {card.kind === 'eq' && (
                                    <button onClick={() => onAssistantCardAction('eq', '应用“温暖讲述”EQ预设')} className="mt-1.5 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-1 text-[10px] text-primary">
                                      应用“温暖讲述”EQ预设
                                    </button>
                                  )}
                                  {card.kind === 'regenerate' && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      <button onClick={() => onAssistantCardAction('regenerate', '使用现有音色重生成（温暖参数）')} className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-1 text-[10px] text-primary">
                                        使用现有音色重生成（温暖参数）
                                      </button>
                                      <button onClick={() => onAssistantCardAction('regenerate', '生成重录批注单')} className="rounded-md border border-border px-1.5 py-1 text-[10px]">
                                        生成重录批注单
                                      </button>
                                    </div>
                                  )}
                                  {card.kind === 'ducking' && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      <button onClick={() => onAssistantCardAction('ducking', '一键应用：人声闪避 (Auto-Ducking)')} className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-1 text-[10px] text-primary">
                                        一键应用：人声闪避 (Auto-Ducking)
                                      </button>
                                      <button onClick={() => onAssistantCardAction('ducking', '已将 BGM 轨道音量降低 3dB')} className="rounded-md border border-border px-1.5 py-1 text-[10px]">
                                        BGM 降低 3dB
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                      {assistantThinking && (
                        <div className="mr-6 rounded-md border border-border bg-background p-2 text-[11px]">
                          <p className="mb-1 text-[10px] text-muted-foreground">AI 正在综合判断...</p>
                          <div className="space-y-1">
                            {assistantThinkingSteps.map((step, index) => (
                              <p key={step} className={assistantThinkingStep > index ? 'text-foreground' : 'text-muted-foreground'}>
                                ✔️ {step}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        value={assistantInput}
                        onChange={(event) => setAssistantInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') submitAssistantMessage()
                        }}
                        placeholder="输入你的感觉描述，例如：这段开场太干了，想温暖一些"
                        className="h-8 w-full rounded-md border border-border bg-card px-2 text-[11px] outline-none focus:border-primary/40"
                      />
                      <button
                        onClick={() => submitAssistantMessage()}
                        disabled={!assistantInput.trim() || assistantThinking}
                        className={`rounded-md border px-2 py-1 text-[11px] ${
                          !assistantInput.trim() || assistantThinking
                            ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                            : 'border-primary/30 bg-primary/10 text-primary'
                        }`}
                      >
                        发送
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={startBasicProofread}
                      disabled={proofreadStatus === 'running'}
                      className={`inline-flex items-center px-0 py-0 text-xs underline-offset-2 ${
                        proofreadStatus === 'running' ? 'cursor-not-allowed text-muted-foreground' : 'text-primary hover:underline'
                      }`}
                    >
                      进行基础校对
                    </button>
                    <p className="text-[11px] text-muted-foreground">
                      检测范围：{proofreadHasCopy === null ? '待确认文案状态' : proofreadHasCopy ? '错音 + 口水音/爆破音' : '口水音/爆破音'}
                    </p>
                    {proofreadStatus === 'running' && (
                      <div className="rounded-md border border-border bg-background/70 p-2">
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span>AI 校对中...</span>
                          <span className="text-primary">{proofreadProgress}%</span>
                        </div>
                        <div className="h-1.5 rounded bg-muted">
                          <div className="h-full rounded bg-primary transition-[width] duration-150" style={{ width: `${proofreadProgress}%` }} />
                        </div>
                      </div>
                    )}
                    <div
                      className={`overflow-hidden rounded-md border border-border bg-background/60 transition-all duration-300 ${
                        proofreadPanelOpen ? 'max-h-[520px] translate-x-0 opacity-100' : 'max-h-0 translate-x-4 opacity-0'
                      }`}
                    >
                      <div className="border-b border-border/70 px-2 py-1.5 text-[11px] font-medium">校对列表</div>
                      {proofreadIssues.length > 0 ? (
                        <div className="max-h-[420px] space-y-1.5 overflow-y-auto p-2">
                          {proofreadIssues.map((issue) => {
                            const palette = getIssuePalette(issue.type)
                            const focused = focusedIssue?.id === issue.id
                            return (
                              <article key={issue.id} className={`rounded-md border p-2 text-[11px] ${focused ? 'border-primary/40 bg-primary/5' : 'border-border bg-card/80'}`}>
                                <button onClick={() => focusIssue(issue)} className="mb-1 block w-full text-left">
                                  <div className="mb-1 flex items-center justify-between gap-2">
                                    <span className={`rounded border px-1 py-0.5 text-[10px] ${palette.badgeClass}`}>{palette.badge}</span>
                                    <span className="text-[10px] text-muted-foreground">{issue.timeLabel}</span>
                                  </div>
                                  <p className="font-medium">{issue.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{issue.trackName} · {issue.blockName}</p>
                                </button>
                                {issue.type === 'misread' ? (
                                  <>
                                    <p className="mb-1 text-[10px] text-muted-foreground">原文：{issue.originalText} | 识别：{issue.detectedText}</p>
                                    <div className="flex flex-wrap gap-1 text-[10px]">
                                      <button onClick={() => resolveIssue(issue, 'AI 生成替换')} className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">AI 生成替换</button>
                                      <button onClick={() => resolveIssue(issue, '标记重录')} className="rounded-md border border-orange-300/70 bg-orange-50 px-1.5 py-0.5 text-orange-700">标记重录</button>
                                      <button onClick={() => resolveIssue(issue, '忽略')} className="rounded-md border border-border px-1.5 py-0.5">忽略</button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex gap-1 text-[10px]">
                                    <button onClick={() => resolveIssue(issue, '一键消除')} className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">一键消除</button>
                                    <button onClick={() => resolveIssue(issue, '忽略')} className="rounded-md border border-border px-1.5 py-0.5">忽略</button>
                                  </div>
                                )}
                              </article>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-2 text-[11px] text-muted-foreground">暂无待处理问题</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="border-t border-border/70 pt-2">
              <h2 className="mb-1.5 text-sm font-semibold">音频设置</h2>
              {selectedTrack && selectedTuning ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex gap-1">
                    {[
                      ['basic', '基础'],
                      ['tone', '音色'],
                      ['speed', '语速'],
                    ].map(([key, label]) => {
                      const active = tuningTab === key
                      return (
                        <button
                          key={key}
                          onClick={() => setTuningTab(key as 'basic' | 'tone' | 'speed')}
                          className={`rounded-md border px-2 py-1 text-[11px] ${active
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="rounded-lg border border-border bg-background/70 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{selectedTuning.channel}</p>
                        <p className="text-[10px] text-muted-foreground">当前选中：{selectedTrack.name}</p>
                      </div>
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        {selectedTuning.profile}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {selectedTuning.tabs.map((tab, index) => (
                        <span
                          key={tab}
                          className={`rounded-md border px-1.5 py-1 text-[10px] ${index === 0
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-border bg-card text-muted-foreground'
                            }`}
                        >
                          {tab}
                        </span>
                      ))}
                    </div>
                  </div>

                  {tuningTab === 'basic' && (
                    <>
                      <div className="grid grid-cols-2 gap-1.5">
                        {selectedTuning.controls.map((control) => (
                          <div key={control.label} className="rounded-md border border-border bg-background/70 p-2">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[11px]">{control.label}</span>
                              <span className="text-[10px] text-primary">{control.amount}</span>
                            </div>
                            <div className="h-1.5 rounded bg-muted">
                              <div className="h-full rounded bg-primary" style={{ width: control.value }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-md border border-border bg-background/70 p-2">
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span>{selectedTuning.meter}</span>
                          <span className="text-primary">{selectedTuning.meterValue}</span>
                        </div>
                        <div className="mb-2 h-7 rounded bg-[linear-gradient(90deg,color-mix(in_oklch,var(--primary)_28%,transparent),transparent)]" />
                        <div className="h-1.5 rounded bg-muted">
                          <div className="h-full rounded bg-primary" style={{ width: selectedTuning.meterValue }} />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                          <span>{selectedTuning.rangeLeft}</span>
                          <span>{selectedTuning.rangeCenter}</span>
                          <span>{selectedTuning.rangeRight}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {tuningTab === 'tone' && (
                    <div className="space-y-1.5">
                      <div className="rounded-md border border-border bg-background/70 p-2">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[11px]">复刻音色</span>
                          <span className="text-[10px] text-primary">按轨道应用</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={openCloneDialog}
                            className="flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-2 text-left transition hover:bg-primary/10"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))] text-xs">
                              +
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-medium">点击克隆</p>
                              <p className="text-[10px] text-primary">录音/上传音频</p>
                            </div>
                          </button>
                          {clonedVoiceItems.map((name) => {
                            const active = activeTone === name
                            return (
                              <button
                                key={name}
                                onClick={() => setToneForCurrentTrack(name)}
                                className={`flex items-center gap-2 rounded-md border p-2 text-left transition ${
                                  active
                                    ? 'border-primary/40 bg-primary/10'
                                    : 'border-border bg-card hover:border-primary/30'
                                }`}
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))] text-xs">
                                  声
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[11px] font-medium">{name}</p>
                                  <p className="text-[10px] text-primary">我的音色</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-md border border-border bg-background/70 p-2">
                        <h3 className="mb-1.5 text-[11px] font-semibold text-muted-foreground">优质音色</h3>
                        <div className="mb-1.5 rounded-md border border-border bg-card/70 p-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              value={toneQuery}
                              onChange={(event) => setToneQuery(event.target.value)}
                              placeholder="AI关键词搜索：女声 温暖 解说"
                              className="h-7 w-full rounded-md border border-border bg-card px-2 text-[11px] text-foreground outline-none focus:border-primary/40"
                            />
                            {(toneQuery || selectedToneTags.length > 0) && (
                              <button
                                onClick={clearToneFilter}
                                className="h-7 shrink-0 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                清除
                              </button>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {curatedVoiceTags.map((tag) => {
                              const active = selectedToneTags.includes(tag)
                              return (
                                <button
                                  key={tag}
                                  onClick={() => toggleToneTag(tag)}
                                  className={`rounded-md border px-1.5 py-0.5 text-[10px] ${active
                                      ? 'border-primary/40 bg-primary/15 text-primary'
                                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                  {tag}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {filteredCuratedVoices.map((asset) => {
                            const active = activeTone === asset.name
                            return (
                              <button
                                key={asset.name}
                                onClick={() => setToneForCurrentTrack(asset.name)}
                                className={`flex items-center gap-2 rounded-md border p-2 text-left transition ${active
                                    ? 'border-primary/40 bg-primary/10'
                                    : 'border-border bg-card hover:border-primary/30'
                                  }`}
                              >
                                <div className="h-8 w-8 shrink-0 rounded-md bg-[linear-gradient(140deg,color-mix(in_oklch,var(--primary)_30%,var(--muted)),var(--muted))]" />
                                <div className="min-w-0">
                                  <p className="truncate text-[11px] font-medium">{asset.name}</p>
                                  <p className="text-[10px] text-primary">智作优选</p>
                                </div>
                              </button>
                            )
                          })}
                          {filteredCuratedVoices.length === 0 && (
                            <p className="col-span-2 rounded-md border border-dashed border-border bg-background/70 p-2 text-[11px] text-muted-foreground">
                              未命中音库结果，尝试更换关键词或减少标签。
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {tuningTab === 'speed' && (
                    <div className="rounded-md border border-border bg-background/70 p-2">
                      <div className="mb-1.5 flex items-center justify-between text-[11px]">
                        <span>语速</span>
                        <span className="text-primary">{activeSpeechRate.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.8"
                        step="0.05"
                        value={activeSpeechRate}
                        onChange={(event) => setSpeechRateForCurrentTrack(Number(event.target.value))}
                        className="h-1.5 w-full accent-[var(--primary)]"
                      />
                      <div className="mt-1.5 flex gap-1">
                        {[0.75, 1, 1.25, 1.5].map((rate) => {
                          const active = Math.abs(activeSpeechRate - rate) < 0.001
                          return (
                            <button
                              key={rate}
                              onClick={() => setSpeechRateForCurrentTrack(rate)}
                              className={`rounded-md border px-1.5 py-0.5 text-[10px] ${active
                                  ? 'border-primary/40 bg-primary/15 text-primary'
                                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                            >
                              {rate.toFixed(2)}x
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {compareOpen && latestVersionForCompare && compareTargetVersion && (
                    <div className="space-y-1.5 rounded-md border border-border bg-background/70 p-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-muted-foreground">对比来源：</span>
                        <button
                          onClick={() => setCompareSource('current')}
                          className={`rounded-md border px-1.5 py-0.5 ${
                            compareSource === 'current'
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-border bg-card text-muted-foreground'
                          }`}
                        >
                          当前版本
                        </button>
                        <button
                          onClick={() => setCompareSource('history')}
                          disabled={previousAppliedVersions.length === 0}
                          className={`rounded-md border px-1.5 py-0.5 ${
                            compareSource === 'history'
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-border bg-card text-muted-foreground'
                          } ${previousAppliedVersions.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          往期版本
                        </button>
                        {compareSource === 'history' && previousAppliedVersions.length > 0 && (
                          <select
                            value={compareHistoryId || previousAppliedVersions.at(-1)?.id || ''}
                            onChange={(event) => setCompareHistoryId(event.target.value)}
                            className="h-6 rounded-md border border-border bg-card px-1.5 text-[11px]"
                          >
                            {previousAppliedVersions.map((version) => (
                              <option key={version.id} value={version.id}>
                                {version.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="rounded-md border border-border bg-card p-2">
                        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>当前：{latestVersionForCompare.label}</span>
                          <span>对比：{compareTargetVersion.label}</span>
                        </div>
                        <div className="relative h-20 overflow-hidden rounded bg-muted/40">
                          <div className="absolute inset-0 bg-[repeating-linear-gradient(to_right,transparent_0,transparent_16px,rgba(0,0,0,0.06)_17px)]" />
                          <div className="absolute inset-0">
                            {compareTargetVersion.waveform.map((value, index) => (
                              <span
                                key={`cmp-${index}`}
                                className="absolute bottom-0 w-[2px] rounded-t bg-slate-400/70"
                                style={{ left: `${(index / compareTargetVersion.waveform.length) * 100}%`, height: `${value}%` }}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0">
                            {latestVersionForCompare.waveform.map((value, index) => (
                              <span
                                key={`cur-${index}`}
                                className="absolute bottom-0 w-[2px] rounded-t bg-primary/80"
                                style={{ left: `${(index / latestVersionForCompare.waveform.length) * 100}%`, height: `${value}%` }}
                              />
                            ))}
                          </div>
                          <span
                            className="pointer-events-none absolute bottom-0 top-0 z-20 w-[2px] bg-black/75"
                            style={{ left: `calc(${comparePlayback.progress}% - 1px)` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 text-[11px]">
                    <button className="rounded-md border border-border bg-card px-2 py-1">重置</button>
                    <button
                      onClick={() => setCompareOpen((prev) => !prev)}
                      className={`rounded-md border px-2 py-1 ${
                        compareOpen
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      {compareOpen ? '关闭对比' : '对比'}
                    </button>
                    <button
                      onClick={applyCurrentTuning}
                      className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary"
                    >
                      应用到轨道
                    </button>
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border bg-background/70 p-2 text-xs text-muted-foreground">
                  请在时间轴中先选择一个轨道，再进行精细调优。
                </p>
              )}
            </section>
          </aside>
        </section>

        {cloneDialogOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-3" onClick={closeCloneDialog}>
            <div
              className="w-full max-w-md rounded-lg border border-border bg-card p-3 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">复刻音色</h3>
                <button className="rounded-md border border-border px-2 py-1 text-[11px]" onClick={closeCloneDialog}>
                  关闭
                </button>
              </div>
              <div className="mb-2 flex gap-1">
                <button
                  onClick={() => setCloneMethod('record')}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    cloneMethod === 'record'
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  录音克隆
                </button>
                <button
                  onClick={() => setCloneMethod('upload')}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    cloneMethod === 'upload'
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  上传音频克隆
                </button>
              </div>

              <div className="space-y-2 rounded-md border border-border bg-background/70 p-2">
                <label className="text-[11px] text-muted-foreground">新音色名称</label>
                <input
                  value={cloneNameInput}
                  onChange={(event) => setCloneNameInput(event.target.value)}
                  placeholder="例如：旁白女声-清亮"
                  className="h-8 w-full rounded-md border border-border bg-card px-2 text-[11px] outline-none focus:border-primary/40"
                />

                {cloneMethod === 'record' && (
                  <div className="space-y-1.5">
                    <div className="rounded-md border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground">
                      录音时长：{recordSeconds}s（至少 3 秒）
                    </div>
                    <button
                      onClick={() => setIsRecording((prev) => !prev)}
                      className={`rounded-md border px-2 py-1 text-[11px] ${
                        isRecording
                          ? 'border-destructive/40 bg-destructive/10 text-destructive'
                          : 'border-primary/40 bg-primary/10 text-primary'
                      }`}
                    >
                      {isRecording ? '停止录音' : '开始录音'}
                    </button>
                  </div>
                )}

                {cloneMethod === 'upload' && (
                  <div className="space-y-1.5">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        setUploadedAudioName(file ? file.name : '')
                      }}
                      className="w-full text-[11px]"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {uploadedAudioName ? `已选择：${uploadedAudioName}` : '请上传一段清晰的人声音频'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-2 flex justify-end gap-1.5">
                <button className="rounded-md border border-border px-2 py-1 text-[11px]" onClick={closeCloneDialog}>
                  取消
                </button>
                <button
                  onClick={submitClone}
                  disabled={!cloneNameInput.trim() || (cloneMethod === 'record' ? recordSeconds < 3 : !uploadedAudioName)}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    !cloneNameInput.trim() || (cloneMethod === 'record' ? recordSeconds < 3 : !uploadedAudioName)
                      ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                      : 'border-primary/30 bg-primary/10 text-primary'
                  }`}
                >
                  开始克隆
                </button>
              </div>
            </div>
          </div>
        )}

        {copyConfirmOpen && (
          <div className="fixed inset-0 z-[55] grid place-items-center bg-black/35 p-3" onClick={() => setCopyConfirmOpen(false)}>
            <div className="w-full max-w-sm rounded-lg border border-border bg-card p-3 shadow-xl" onClick={(event) => event.stopPropagation()}>
              <h3 className="text-sm font-semibold">请确认是否已关联文案？</h3>
              <p className="mt-1 text-xs text-muted-foreground">已关联：检测错音 + 物理杂音；未关联：仅检测物理杂音。</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setCopyConfirmOpen(false)
                    beginBasicProofread(true)
                  }}
                  className="rounded-md border border-primary/35 bg-primary/15 px-2 py-1.5 text-xs font-medium text-primary"
                >
                  已关联
                </button>
                <button
                  onClick={() => {
                    setCopyConfirmOpen(false)
                    beginBasicProofread(false)
                  }}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  未关联
                </button>
              </div>
            </div>
          </div>
        )}

        {clipContextMenu && (
          <div
            className="fixed z-[60] min-w-44 rounded-md border border-border bg-card p-1.5 shadow-xl"
            style={{ left: clipContextMenu.x + 8, top: clipContextMenu.y + 8 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={importClipAsAsset}
              className="w-full rounded-md px-2 py-1.5 text-left text-[11px] hover:bg-accent/60"
            >
              {clipContextMenu.assetType === 'sfx' ? '导入音效资产' : '导入音乐资产'}
            </button>
            <p className="px-2 pt-1 text-[10px] text-muted-foreground">
              片段：{clipContextMenu.blockName}
            </p>
          </div>
        )}

      </div>
    </main>
  )
}
