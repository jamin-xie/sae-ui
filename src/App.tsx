import { useEffect, useRef, useState } from 'react'

type TrackRow = { name: string; blocks: string[] }
type AssetTab = 'sfx' | 'music' | 'voice' | 'my_assets'
type LibrarySubTab = 'curated' | 'ai'
type LibraryFilterTab = 'sfx' | 'music'
type CuratedAsset = { name: string; tags: string[]; keywords: string[] }
type ProjectAsset = {
  id: string
  name: string
  category: 'video' | 'audio' | 'temp'
  duration: string
  resolution?: string
  note?: string
}
type PersonalAsset = {
  id: string
  name: string
  type: 'sfx' | 'music' | 'voice'
  source: '收藏' | '项目升维' | 'AI创作'
  aiTags: string[]
}
type AiGenRecord = {
  id: string
  prompt: string
  duration: number
  results: string[]
  createdAt: string
}
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
type ProofreadIssueItem = {
  id: string
  icon: string
  levelLabel: string
  levelColorClass: string
  time: string
  description: string
  trackLabel: string
  originalText?: string
  recognizedText?: string
}
type AssistantMusicSuggestion = {
  tracks: string[]
}
type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  proofreadItems?: ProofreadIssueItem[]
  musicSuggestion?: AssistantMusicSuggestion
}

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

const initialClonedVoices = ['音色01', '音色02']
const curatedVoices: CuratedAsset[] = [
  { name: '机器人2', tags: ['AI声线', '科技', '中性'], keywords: ['机器人', '电子', '解说'] },
  { name: '怪物2', tags: ['角色', '低沉', '电影感'], keywords: ['怪物', '反派', '预告片'] },
  { name: '怪物', tags: ['角色', '暗黑', '冲击'], keywords: ['厚重', '怒吼', '氛围'] },
  { name: '女生', tags: ['人声', '清亮', '广告'], keywords: ['女声', '口播', '温柔'] },
  { name: '男生', tags: ['人声', '稳重', '旁白'], keywords: ['男声', '纪录片', '配音'] },
  { name: '京腔', tags: ['方言', '特色', '剧情'], keywords: ['北京话', '角色音', '方言配音'] },
]
const curatedSfx: CuratedAsset[] = [
  { name: '赛博冲击', tags: ['赛博', '冲击', '转场'], keywords: ['科技感', '重击', '动作'] },
  { name: '自然雨声', tags: ['自然', '环境', '氛围'], keywords: ['雨滴', '白噪声', '背景'] },
  { name: '电影低频', tags: ['电影', '低频', '悬疑'], keywords: ['boom', '紧张', '预告片'] },
  { name: 'UI 反馈包', tags: ['UI', '交互', '轻量'], keywords: ['点击', '提示', '界面'] },
  { name: '机械臂', tags: ['机械', '金属', '工业'], keywords: ['机器人', '关节', '运镜'] },
  { name: '能量脉冲', tags: ['科幻', '能量', '节奏'], keywords: ['脉冲', '电流', '未来感'] },
]
const curatedMusic: CuratedAsset[] = [
  { name: '电影史诗', tags: ['史诗', '管弦', '大场面'], keywords: ['预告片', '宏大', '情绪推进'] },
  { name: '温暖民谣', tags: ['民谣', '温暖', '生活'], keywords: ['木吉他', 'Vlog', '轻松'] },
  { name: '悬疑脉冲', tags: ['悬疑', '节奏', '紧张'], keywords: ['脉冲', '推理', '压迫感'] },
  { name: '国潮打击', tags: ['国风', '打击', '节庆'], keywords: ['鼓点', '中国风', '品牌片'] },
  { name: 'Future Bass', tags: ['电子', '动感', '青年'], keywords: ['drop', '活力', '科技发布'] },
  { name: '氛围环境', tags: ['Ambient', '铺底', '空间'], keywords: ['氛围', '空灵', '背景层'] },
]
const initialProjectAssets: ProjectAsset[] = [
  { id: 'proj-video-1', name: 'brand-launch.mp4', category: 'video', duration: '01:42', resolution: '1920x1080' },
  { id: 'proj-audio-1', name: '采访同期声-原始.wav', category: 'audio', duration: '00:58', note: '现场收音' },
  { id: 'proj-temp-1', name: '临时生成-冲击转场-01.wav', category: 'temp', duration: '00:05', note: '待筛选' },
]
const initialPersonalAssets: PersonalAsset[] = [
  { id: 'personal-music-1', name: '晨间钢琴', type: 'music', source: '收藏', aiTags: ['钢琴', '温暖', '叙事'] },
  { id: 'personal-music-2', name: '轻电子循环', type: 'music', source: '收藏', aiTags: ['电子', '节奏', '科技'] },
  { id: 'personal-sfx-1', name: '片头鼓点', type: 'sfx', source: '收藏', aiTags: ['冲击', '鼓点', '开场'] },
  { id: 'personal-sfx-2', name: '呼啸转场', type: 'sfx', source: '收藏', aiTags: ['转场', '空气感', '速度'] },
]
const assistantQuickPrompts = [
  { icon: '📝', label: '基础校对', prompt: '请做基础校对，检查文本漏读与错读。' },
  { icon: '🎭', label: '情绪审查', prompt: '请审查配音情绪与文案、画面的适配度。' },
  { icon: '🎬', label: '风格对齐', prompt: '请检查 BGM 与视频整体风格是否协调。' },
  { icon: '🎵', label: '配乐推荐', prompt: '请根据当前画面给出配乐建议。' },
]
const demoProofreadItems: ProofreadIssueItem[] = [
  {
    id: 'noise-1',
    icon: '🟡',
    levelLabel: '杂音',
    levelColorClass: 'text-amber-500',
    time: '00:06.8',
    description: '明显口水音',
    trackLabel: '人声-说话人1 · 原声对白',
  },
  {
    id: 'misread-1',
    icon: '🔴',
    levelLabel: '错音',
    levelColorClass: 'text-red-500',
    time: '00:12.4',
    description: '错读字词',
    trackLabel: '人声-说话人1 · 原声对白',
    originalText: '角色',
    recognizedText: '脚色',
  },
  {
    id: 'plosive-1',
    icon: '🟠',
    levelLabel: '爆破音',
    levelColorClass: 'text-orange-500',
    time: '00:18.2',
    description: '喷麦',
    trackLabel: '人声-说话人1 · 原声对白',
  },
]

const formatAssetTypeLabel = (type: 'sfx' | 'music' | 'voice') => {
  if (type === 'sfx') return '音效'
  if (type === 'music') return '音乐'
  return '音色'
}

const inferPersonalAssetTags = (fileName: string, type: 'sfx' | 'music') => {
  const lowered = fileName.toLowerCase()
  const tagRules: Array<[string, string]> = [
    ['rain', '雨声'],
    ['雨', '雨声'],
    ['wind', '风声'],
    ['风', '风声'],
    ['hit', '冲击'],
    ['impact', '冲击'],
    ['转场', '转场'],
    ['whoosh', '转场'],
    ['piano', '钢琴'],
    ['guitar', '木吉他'],
    ['warm', '温暖'],
    ['ambient', '氛围'],
    ['suspense', '悬疑'],
    ['电子', '电子'],
    ['electro', '电子'],
    ['drum', '鼓点'],
  ]
  const matched = tagRules.filter(([keyword]) => lowered.includes(keyword)).map(([, tag]) => tag)
  const base = type === 'music' ? ['音乐', 'AI打标'] : ['音效', 'AI打标']
  const unique = Array.from(new Set([...matched, ...base]))
  return unique.slice(0, 4)
}

const inferPersonalAssetType = (fileName: string): 'sfx' | 'music' => {
  const lowered = fileName.toLowerCase()
  const musicHints = ['bgm', 'music', 'song', '配乐', '旋律', '钢琴', '吉他', '弦乐']
  return musicHints.some((hint) => lowered.includes(hint)) ? 'music' : 'sfx'
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

const parseTimelineTimeToPercent = (timeLabel: string) => {
  const matched = timeLabel.match(/^(\d{2}):(\d{2}(?:\.\d+)?)$/)
  if (!matched) return 0
  const minutes = Number(matched[1])
  const seconds = Number(matched[2])
  const totalSeconds = minutes * 60 + seconds
  // Timeline ruler is 00:00~00:50 visually; clamp in 60s window for stability.
  return Math.max(0, Math.min(100, (totalSeconds / 60) * 100))
}

const getProofreadMarkerColorClass = (levelLabel: string) => {
  if (levelLabel.includes('错')) return 'bg-red-500'
  if (levelLabel.includes('爆')) return 'bg-orange-500'
  return 'bg-amber-400'
}

export default function App() {
  const [assetTab, setAssetTab] = useState<AssetTab>('sfx')
  const [assetNavExpanded, setAssetNavExpanded] = useState<Record<AssetTab, boolean>>({
    sfx: true,
    music: false,
    voice: false,
    my_assets: false,
  })
  const [materialTabs, setMaterialTabs] = useState<MaterialTab[]>(initialMaterialTabs)
  const [activeMaterialId, setActiveMaterialId] = useState(initialMaterialTabs[0].id)
  const [selectedTrackKey, setSelectedTrackKey] = useState(
    `${initialMaterialTabs[0].id}::${initialMaterialTabs[0].tracks[0].name}`,
  )
  const [curatedQuery, setCuratedQuery] = useState<Record<LibraryFilterTab, string>>({ sfx: '', music: '' })
  const [toneQuery, setToneQuery] = useState('')
  const [selectedToneTags, setSelectedToneTags] = useState<string[]>([])
  const [tuningTab, setTuningTab] = useState<'basic' | 'tone' | 'speed'>('basic')
  const [selectedToneByTrack, setSelectedToneByTrack] = useState<Record<string, string>>({})
  const [speechRateByTrack, setSpeechRateByTrack] = useState<Record<string, number>>({})
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([])
  const [assistantThinking, setAssistantThinking] = useState(false)
  const [assistantThinkingStep, setAssistantThinkingStep] = useState(0)
  const assistantScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const assistantScrollAnchorRef = useRef<HTMLDivElement | null>(null)
  const [assistantRangeLabel] = useState('01:10 - 01:45')
  const [librarySubTab, setLibrarySubTab] = useState<Record<'sfx' | 'music', LibrarySubTab>>({
    sfx: 'curated',
    music: 'curated',
  })
  const [aiGenPromptByTab, setAiGenPromptByTab] = useState<Record<'sfx' | 'music', string>>({ sfx: '', music: '' })
  const [aiGenDurationByTab, setAiGenDurationByTab] = useState<Record<'sfx' | 'music', number>>({ sfx: 5, music: 60 })
  const [aiGenResultsByTab, setAiGenResultsByTab] = useState<Record<'sfx' | 'music', string[]>>({ sfx: [], music: [] })
  const [aiGenViewByTab, setAiGenViewByTab] = useState<Record<'sfx' | 'music', 'input' | 'history'>>({
    sfx: 'input',
    music: 'input',
  })
  const [aiGenRecordsByTab, setAiGenRecordsByTab] = useState<Record<'sfx' | 'music', AiGenRecord[]>>({
    sfx: [],
    music: [],
  })
  const [voiceLibrarySubTab, setVoiceLibrarySubTab] = useState<'tts' | 'ai_voice'>('tts')
  const [aiVoicePrompt, setAiVoicePrompt] = useState('')
  const [aiVoiceDuration, setAiVoiceDuration] = useState(10)
  const [aiVoiceResults, setAiVoiceResults] = useState<string[]>([])
  const [aiVoiceView, setAiVoiceView] = useState<'input' | 'history'>('input')
  const [aiVoiceRecords, setAiVoiceRecords] = useState<AiGenRecord[]>([])
  const [voiceStage, setVoiceStage] = useState<'main' | 'picker'>('main')
  const [voiceActor, setVoiceActor] = useState('魔天河')
  const [voiceScript, setVoiceScript] = useState('')
  const [voiceEmotion, setVoiceEmotion] = useState('冷静')
  const [voiceIntensity, setVoiceIntensity] = useState('正常')
  const [voiceSpeed, setVoiceSpeed] = useState(1)
  const [voiceResult, setVoiceResult] = useState('')
  const [myAssetSubTab, setMyAssetSubTab] = useState<'project' | 'personal'>('project')
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>(initialProjectAssets)
  const [personalAssets, setPersonalAssets] = useState<PersonalAsset[]>(initialPersonalAssets)
  const [personalAssetQuery, setPersonalAssetQuery] = useState('')
  const [personalAssetTypeFilter, setPersonalAssetTypeFilter] = useState<'all' | 'music' | 'sfx' | 'voice'>('all')
  const personalAssetUploadInputRef = useRef<HTMLInputElement | null>(null)
  const [timelineSelectionLabel, setTimelineSelectionLabel] = useState('01:10 - 01:45')
  const [smartLoading, setSmartLoading] = useState(false)
  const [smartTargetTab, setSmartTargetTab] = useState<'sfx' | 'music' | null>(null)
  const [smartQueryByTab, setSmartQueryByTab] = useState<Record<'sfx' | 'music', string>>({ sfx: '', music: '' })
  const [sfxNavTag, setSfxNavTag] = useState('热门')
  const [musicNavTag, setMusicNavTag] = useState('热门')
  const [hoverPreviewAsset, setHoverPreviewAsset] = useState('')
  const [smartActionMenuClip, setSmartActionMenuClip] = useState('')
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
  const [timelineTool, setTimelineTool] = useState<'select' | 'trim' | 'drag' | 'zoom'>('select')
  const [clonedVoiceItems, setClonedVoiceItems] = useState<string[]>(initialClonedVoices)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [cloneMethod, setCloneMethod] = useState<'record' | 'upload'>('record')
  const [cloneNameInput, setCloneNameInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [uploadedAudioName, setUploadedAudioName] = useState('')
  const [voiceGroupCollapsedByMaterial, setVoiceGroupCollapsedByMaterial] = useState<Record<string, boolean>>({})
  const [proofreadMarkersByTrack, setProofreadMarkersByTrack] = useState<Record<string, ProofreadIssueItem[]>>({})
  const activeMaterial = materialTabs.find((tab) => tab.id === activeMaterialId)
  const selectedTrackName = selectedTrackKey.split('::')[1]
  const selectedTrack = activeMaterial?.tracks.find((track) => track.name === selectedTrackName) ?? activeMaterial?.tracks[0]
  const selectedTrackMeta = selectedTrack ? getTrackMeta(selectedTrack.name) : null
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
  const sfxNavTags = ['热门', '赛博', '冲击', '转场', '自然']
  const musicNavTags = ['热门', '温暖', '悬疑', '电子', 'Ambient']
  const filteredPersonalAssets = personalAssets.filter((asset) => {
    const searchText = `${asset.name} ${asset.type} ${asset.aiTags.join(' ')}`.toLowerCase()
    const terms = personalAssetQuery.toLowerCase().split(/\s+/).filter(Boolean)
    const queryMatched = terms.length === 0 || terms.every((term) => searchText.includes(term))
    const typeMatched = personalAssetTypeFilter === 'all' || asset.type === personalAssetTypeFilter
    return queryMatched && typeMatched
  })
  const selectedClipCount = selectedClipKey ? 1 : 0
  const assistantFocusLabel = selectedTrack
    ? `${selectedTrack.name} [${assistantRangeLabel}]`
    : `人声轨 1 [${assistantRangeLabel}]`
  const assistantThinkingSteps = [
    '正在分析文本语义：[温暖/美好/讲述]',
    '正在分析当前人声：[音调偏高/语速偏快/冷硬]',
    '正在检查同期背景轨：[当前无 BGM]',
  ]
  const curatedVoiceTags = getCuratedTags(curatedVoices)
  const activeAssetLibraryTab = assetTab === 'music' ? 'music' : 'sfx'
  const smartSearchActive = Boolean(smartQueryByTab[activeAssetLibraryTab])
  const sfxQueryTerms = curatedQuery.sfx
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const sfxFilteredAssets = curatedSfx.filter((asset) => {
    const tagMatched = sfxNavTag === '热门' || asset.tags.includes(sfxNavTag)
    if (!tagMatched) return false
    const searchText = `${asset.name} ${asset.tags.join(' ')} ${asset.keywords.join(' ')}`.toLowerCase()
    return sfxQueryTerms.length === 0 || sfxQueryTerms.every((term) => searchText.includes(term))
  })
  const musicQueryTerms = curatedQuery.music
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const musicFilteredAssets = curatedMusic.filter((asset) => {
    const tagMatched = musicNavTag === '热门' || asset.tags.includes(musicNavTag)
    if (!tagMatched) return false
    const searchText = `${asset.name} ${asset.tags.join(' ')} ${asset.keywords.join(' ')}`.toLowerCase()
    return musicQueryTerms.length === 0 || musicQueryTerms.every((term) => searchText.includes(term))
  })
  const firstVoiceTrackIndex = activeMaterial ? activeMaterial.tracks.findIndex((track) => track.name.startsWith('人声')) : -1
  const activeVoiceTracks = activeMaterial ? activeMaterial.tracks.filter((track) => track.name.startsWith('人声')) : []
  const activeVoiceGroupCollapsed = activeMaterial ? Boolean(voiceGroupCollapsedByMaterial[activeMaterial.id]) : false

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
    if (!hoverPreviewAsset || !selectedClipKey) return
    setClipPlayback({ clipKey: selectedClipKey, progress: 0, running: true })
  }, [hoverPreviewAsset, selectedClipKey])

  useEffect(() => {
    if (!smartActionMenuClip) return
    const close = () => setSmartActionMenuClip('')
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [smartActionMenuClip])

  useEffect(() => {
    const container = assistantScrollContainerRef.current
    if (!container) return
    const start = container.scrollTop
    const target = container.scrollHeight - container.clientHeight
    const distance = target - start
    if (Math.abs(distance) < 1) return
    const duration = 520
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - (1 - progress) ** 3
      container.scrollTop = start + distance * eased
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [assistantMessages, assistantThinking])


  const addMaterialTab = () => {
    const newId = `mat-${Date.now()}`
    const viewIndex = materialTabs.length + 1
    const newTab: MaterialTab = {
      id: newId,
      title: `时间轴视图 ${viewIndex}`,
      zoom: '100%',
      split: false,
      tracks: [{ name: '视频', blocks: [] }],
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

  const triggerAssetAiGenerate = (tab: 'sfx' | 'music') => {
    const prompt = aiGenPromptByTab[tab].trim()
    if (!prompt) return
    const prefix = tab === 'sfx' ? '音效' : '音乐'
    const duration = aiGenDurationByTab[tab]
    const generatedResults = Array.from({ length: 4 }, (_, index) => `${prefix}变体 ${index + 1} · ${duration}s`)
    const now = new Date()
    const createdAt = `${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
    setAiGenResultsByTab((prev) => ({
      ...prev,
      [tab]: generatedResults,
    }))
    setAiGenRecordsByTab((prev) => ({
      ...prev,
      [tab]: [
        {
          id: `${tab}-${Date.now()}`,
          prompt,
          duration,
          results: generatedResults,
          createdAt,
        },
        ...prev[tab],
      ],
    }))
    setAiGenViewByTab((prev) => ({ ...prev, [tab]: 'history' }))
  }

  const triggerAiVoiceGenerate = () => {
    const prompt = aiVoicePrompt.trim()
    if (!prompt) return
    const generatedResults = Array.from({ length: 4 }, (_, index) => `人声变体 ${index + 1} · ${aiVoiceDuration}s`)
    const now = new Date()
    const createdAt = `${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
    setAiVoiceResults(generatedResults)
    setAiVoiceRecords((prev) => [
      {
        id: `voice-${Date.now()}`,
        prompt,
        duration: aiVoiceDuration,
        results: generatedResults,
        createdAt,
      },
      ...prev,
    ])
    setAiVoiceView('history')
  }

  const triggerSmartMatch = (target: 'sfx' | 'music') => {
    setSmartTargetTab(target)
    setSmartLoading(true)
    setAssetTab(target)
    setLibrarySubTab((prev) => ({ ...prev, [target]: 'curated' }))
    window.setTimeout(() => {
      const inferred =
        target === 'sfx'
          ? '✨ 抗日剧中日本军队进村时沉重的皮靴脚步声'
          : '✨ 紧张悬疑但克制推进的战场氛围配乐'
      setSmartQueryByTab((prev) => ({ ...prev, [target]: inferred }))
      setCuratedQuery((prev) => ({ ...prev, [target]: inferred }))
      setSmartLoading(false)
    }, 1300)
  }

  const generateVoiceClip = () => {
    if (!voiceScript.trim()) return
    setVoiceResult(`已生成语音：${voiceActor} · ${voiceEmotion}/${voiceIntensity} · ${voiceSpeed.toFixed(1)}x`)
  }

  const handlePersonalAssetUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const nextAssets: PersonalAsset[] = Array.from(files).map((file, index) => {
      const type = inferPersonalAssetType(file.name)
      const displayName = file.name.replace(/\.[^.]+$/, '')
      return {
        id: `personal-upload-${Date.now()}-${index}`,
        name: displayName,
        type,
        source: '项目升维',
        aiTags: inferPersonalAssetTags(file.name, type),
      }
    })
    setPersonalAssets((prev) => [...nextAssets, ...prev])
  }

  const pushAssistantReply = (userText: string) => {
    const lower = userText.toLowerCase()
    if (lower.includes('基础校对') || lower.includes('错读') || lower.includes('漏读') || lower.includes('校对')) {
      if (activeMaterial) {
        const grouped: Record<string, ProofreadIssueItem[]> = {}
        demoProofreadItems.forEach((item) => {
          const trackName = item.trackLabel.split(' · ')[0]?.trim()
          if (!trackName) return
          const trackKey = `${activeMaterial.id}::${trackName}`
          grouped[trackKey] = [...(grouped[trackKey] ?? []), item]
        })
        setProofreadMarkersByTrack((prev) => ({ ...prev, ...grouped }))
      }
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: 'AI回复：校对列表',
          proofreadItems: demoProofreadItems,
        },
      ])
      return
    }
    if (lower.includes('配乐') || lower.includes('bgm')) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: '收到。当前人声语速偏快且偏冷硬，和“温暖讲述”不完全匹配，建议先补氛围再调人声质感。',
          musicSuggestion: {
            tracks: ['暖阳木吉他', '晨光叙事', '温柔片尾钢琴'],
          },
        },
      ])
      return
    }
    if (lower.includes('盖住') || lower.includes('听不清')) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: '明白了。先做自动闪避，确保人声可懂度，再微调BGM电平。',
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
    const { blockName, assetType } = clipContextMenu
    const existingCount = projectAssets.filter((asset) => asset.name.startsWith(blockName)).length
    const name = existingCount === 0 ? blockName : `${blockName}-${existingCount + 1}`
    const nextProjectAsset: ProjectAsset = {
      id: `proj-${Date.now()}`,
      name,
      category: 'temp',
      duration: assetType === 'music' ? '00:30' : '00:05',
      note: `来自时间轴${assetType === 'music' ? '配乐' : '音效'}片段`,
    }
    setProjectAssets((prev) => [nextProjectAsset, ...prev])
    setAssetTab('my_assets')
    setMyAssetSubTab('project')
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
    const fallbackBlock = selectedTrack.blocks[0]
    const targetClipKey =
      selectedClipKey || (activeMaterial && fallbackBlock ? `${activeMaterial.id}::${selectedTrack.name}::${fallbackBlock}` : '')
    if (!targetClipKey) return
    setSelectedClipKey(targetClipKey)
    setClipPlayback({ clipKey: targetClipKey, progress: 0, running: true })
  }

  const renderTrackRow = (row: TrackRow, nested = false) => {
    if (!activeMaterial) return null
    const meta = getTrackMeta(row.name)
    const isAudio = meta.type !== 'video'
    const selected = selectedTrack?.name === row.name
    const markerTrackKey = `${activeMaterial.id}::${row.name}`
    const proofreadMarkers = proofreadMarkersByTrack[markerTrackKey] ?? []
    return (
      <div
        key={`${activeMaterial.id}-${row.name}`}
        onClick={() => setSelectedTrackKey(`${activeMaterial.id}::${row.name}`)}
        className={`grid cursor-pointer grid-cols-[160px_minmax(0,1fr)] border-b border-border/70 transition last:border-b-0 ${nested ? 'bg-sky-50/20' : ''} ${
          selected ? 'bg-primary/5' : ''
        }`}
      >
        <div
          className={`relative flex items-center gap-2 px-2 py-2 text-xs text-foreground ${nested ? 'pl-6' : ''} ${
            selected ? 'bg-primary/10' : nested ? 'bg-sky-50/40' : 'bg-muted/30'
          }`}
        >
          {nested && <span className="absolute bottom-2 left-2 top-2 w-px bg-sky-300/70" />}
          <div className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${meta.color} text-[10px] font-semibold text-white`}>
            {meta.short}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium">{row.name}</p>
            <p className="text-[10px] text-muted-foreground">{nested ? '人声子轨道' : isAudio ? '音频轨道' : '视频轨道'}</p>
          </div>
        </div>
        <div className={`relative overflow-visible p-1.5 ${nested ? 'bg-sky-50/25' : 'bg-background'}`}>
          <div className="absolute inset-0 bg-[repeating-linear-gradient(to_right,transparent_0,transparent_95px,rgba(0,0,0,0.05)_96px)]" />
          <div className="relative flex min-h-12 items-center gap-2">
            {proofreadMarkers.length > 0 && (
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-3">
                {proofreadMarkers.map((marker) => (
                  <span
                    key={`${marker.id}-${marker.time}`}
                    title={`${marker.levelLabel} ${marker.time} ${marker.description}`}
                    className={`absolute top-0 inline-block h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white shadow ${getProofreadMarkerColorClass(marker.levelLabel)}`}
                    style={{ left: `${parseTimelineTimeToPercent(marker.time)}%` }}
                  />
                ))}
              </div>
            )}
            {row.blocks.length === 0 && <span className="text-[10px] text-muted-foreground">空轨道</span>}
            {row.blocks.map((block, blockIndex) => {
              const clipKey = `${activeMaterial.id}::${row.name}::${block}`
              const clipSelected = selectedClipKey === clipKey
              return (
                <span
                  key={block}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedClipKey(clipKey)
                    setSmartActionMenuClip('')
                    const startSecond = 70 + blockIndex * 18
                    const endSecond = startSecond + 35
                    const toLabel = (value: number) =>
                      `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
                    setTimelineSelectionLabel(`${toLabel(startSecond)} - ${toLabel(endSecond)}`)
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
                  className={`group relative rounded-md border px-2 py-1 text-[11px] ${
                    isAudio ? 'border-sky-300/80 bg-sky-100 text-sky-900' : 'border-cyan-300/80 bg-cyan-100 text-cyan-900'
                  } ${clipSelected ? 'ring-2 ring-primary/35' : ''}`}
                  style={{ width: `${blockIndex === 0 ? 38 : 22}%` }}
                >
                  {clipSelected && (
                    <div className="absolute -right-1 -top-7 z-30">
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setSmartActionMenuClip((prev) => (prev === clipKey ? '' : clipKey))
                        }}
                        className="rounded-md border border-primary/35 bg-background px-1.5 py-0.5 text-[10px] text-primary shadow-sm"
                      >
                        ✨ 智能
                      </button>
                      {smartActionMenuClip === clipKey && (
                        <div
                          onClick={(event) => event.stopPropagation()}
                          className="mt-1 min-w-28 rounded-md border border-border bg-card p-1 text-[10px] text-foreground shadow-xl"
                        >
                          <button
                            onClick={() => {
                              triggerSmartMatch('music')
                              setSmartActionMenuClip('')
                            }}
                            className="block w-full rounded px-1.5 py-1 text-left hover:bg-accent/70"
                          >
                            ✨ 智能配乐
                          </button>
                          <button
                            onClick={() => {
                              triggerSmartMatch('sfx')
                              setSmartActionMenuClip('')
                            }}
                            className="block w-full rounded px-1.5 py-1 text-left hover:bg-accent/70"
                          >
                            ✨ 智能配音效
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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

        <section className="grid gap-0 xl:grid-cols-[330px_minmax(0,1fr)_320px]">
          <aside className="space-y-0 p-2 xl:border-r xl:border-border/70">
            <section className="pb-2">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">资产管理</h2>
              </div>
              <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 rounded-lg bg-[linear-gradient(180deg,color-mix(in_oklch,var(--muted)_55%,transparent),transparent)] p-1.5">
                <nav className="space-y-1.5 rounded-md bg-background/80 p-1.5">
                  {[
                    ['sfx', '音效库', '♪'],
                    ['music', '音乐库', '♫'],
                    ['voice', '配音库', '◉'],
                    ['my_assets', '我的资产', '★'],
                  ].map(([key, label, icon]) => {
                    const groupKey = key as AssetTab
                    const activeGroup = assetTab === groupKey
                    const expanded = assetNavExpanded[groupKey]
                    return (
                      <div key={groupKey} className="rounded-md bg-card/55">
                        <button
                          onClick={() => {
                            if (!expanded) {
                              if (groupKey === 'sfx') {
                                setAssetTab('sfx')
                                setLibrarySubTab((prev) => ({ ...prev, sfx: 'curated' }))
                              }
                              if (groupKey === 'music') {
                                setAssetTab('music')
                                setLibrarySubTab((prev) => ({ ...prev, music: 'curated' }))
                              }
                              if (groupKey === 'my_assets') {
                                setAssetTab('my_assets')
                                setMyAssetSubTab('project')
                              }
                              if (groupKey === 'voice') {
                                setAssetTab('voice')
                                setVoiceLibrarySubTab('tts')
                              }
                            }
                            setAssetNavExpanded((prev) => ({
                              ...prev,
                              [groupKey]: !prev[groupKey],
                            }))
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] ${
                            activeGroup
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <span className="text-[10px]">{expanded ? '▾' : '▸'}</span>
                            <span className="text-[10px]">{icon}</span>
                            <span className="truncate">{label}</span>
                          </span>
                        </button>
                        {expanded && (
                          <div className="space-y-1 px-2 pb-2">
                            {groupKey === 'sfx' && (
                              <>
                                <button
                                  onClick={() => {
                                    setAssetTab('sfx')
                                    setLibrarySubTab((prev) => ({ ...prev, sfx: 'curated' }))
                                  }}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[10px] ${
                                    assetTab === 'sfx' && librarySubTab.sfx === 'curated'
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                  }`}
                                >
                                  优质音效
                                </button>
                                <button
                                  onClick={() => {
                                    setAssetTab('sfx')
                                    setLibrarySubTab((prev) => ({ ...prev, sfx: 'ai' }))
                                  }}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[10px] ${
                                    assetTab === 'sfx' && librarySubTab.sfx === 'ai'
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                  }`}
                                >
                                  AI音效
                                </button>
                              </>
                            )}
                            {groupKey === 'music' && (
                              <>
                                <button
                                  onClick={() => {
                                    setAssetTab('music')
                                    setLibrarySubTab((prev) => ({ ...prev, music: 'curated' }))
                                  }}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[10px] ${
                                    assetTab === 'music' && librarySubTab.music === 'curated'
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                  }`}
                                >
                                  优质音乐
                                </button>
                                <button
                                  onClick={() => {
                                    setAssetTab('music')
                                    setLibrarySubTab((prev) => ({ ...prev, music: 'ai' }))
                                  }}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[10px] ${
                                    assetTab === 'music' && librarySubTab.music === 'ai'
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                  }`}
                                >
                                  AI音乐
                                </button>
                              </>
                            )}
                            {groupKey === 'voice' && (
                              <>
                                <button
                                  onClick={() => {
                                    setAssetTab('voice')
                                    setVoiceLibrarySubTab('tts')
                                  }}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[10px] ${
                                    assetTab === 'voice' && voiceLibrarySubTab === 'tts'
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                  }`}
                                >
                                  文本配音
                                </button>
                                <button
                                  onClick={() => {
                                    setAssetTab('voice')
                                    setVoiceLibrarySubTab('ai_voice')
                                  }}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[10px] ${
                                    assetTab === 'voice' && voiceLibrarySubTab === 'ai_voice'
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                  }`}
                                >
                                  AI人声
                                </button>
                              </>
                            )}
                            {groupKey === 'my_assets' && (
                              <>
                                <button
                                  onClick={() => {
                                    setAssetTab('my_assets')
                                    setMyAssetSubTab('project')
                                  }}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[10px] ${
                                    assetTab === 'my_assets' && myAssetSubTab === 'project'
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                  }`}
                                >
                                  项目素材
                                </button>
                                <button
                                  onClick={() => {
                                    setAssetTab('my_assets')
                                    setMyAssetSubTab('personal')
                                  }}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[10px] ${
                                    assetTab === 'my_assets' && myAssetSubTab === 'personal'
                                      ? 'bg-primary/15 text-primary'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                  }`}
                                >
                                  个人资产
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </nav>

                <div className="space-y-2 rounded-md bg-background/65 p-2">

              {(assetTab === 'sfx' || assetTab === 'music') && (
                <div className="space-y-2 text-xs">
                  {librarySubTab[activeAssetLibraryTab] === 'curated' ? (
                    <>
                      {smartLoading && smartTargetTab === activeAssetLibraryTab && (
                        <div className="rounded-md border border-border bg-background/70 p-2">
                          <p className="mb-1 text-[11px] text-primary">AI 正在解读画面与情绪...</p>
                          <div className="space-y-1">
                            <div className="h-2 animate-pulse rounded bg-muted" />
                            <div className="h-2 animate-pulse rounded bg-muted" />
                            <div className="h-2 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      )}
                      <div className="rounded-md bg-background/60 p-2">
                        {activeAssetLibraryTab === 'sfx' ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <textarea
                                value={curatedQuery.sfx}
                                onChange={(event) => {
                                  const next = event.target.value
                                  setSmartQueryByTab((prev) => ({ ...prev, sfx: next }))
                                  setCuratedQuery((prev) => ({ ...prev, sfx: next }))
                                }}
                                placeholder={'输入标签或自然语言描述\n例如：赛博感的能量冲击转场'}
                                className="h-14 w-full resize-none rounded-md border border-primary/35 bg-card px-3 py-2 text-[12px] leading-relaxed outline-none focus:border-primary/55"
                              />
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {sfxNavTags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => setSfxNavTag(tag)}
                                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                                    sfxNavTag === tag
                                      ? 'border-primary/40 bg-primary/15 text-primary'
                                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                            {sfxFilteredAssets.map((asset) => (
                              <article
                                key={asset.name}
                                onMouseEnter={() => {
                                  setHoverPreviewAsset(asset.name)
                                }}
                                onMouseLeave={() => setHoverPreviewAsset('')}
                                className="rounded-md border border-border bg-card/70 px-2 py-1.5"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <p className="truncate font-medium">{asset.name}</p>
                                  <span className="text-[10px] text-muted-foreground">{asset.name.length + 8}s · {80 + (asset.name.length % 50)}BPM</span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {asset.tags.map((tag) => (
                                    <span key={`${asset.name}-${tag}`} className="rounded bg-primary/12 px-1 py-0.5 text-[10px] text-primary">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <div className="mt-1 h-4 rounded bg-[repeating-linear-gradient(90deg,rgba(2,132,199,0.3)_0,rgba(2,132,199,0.3)_2px,transparent_2px,transparent_7px)]" />
                              </article>
                            ))}
                            {sfxFilteredAssets.length === 0 && (
                              <button
                                onClick={() => {
                                  setLibrarySubTab((prev) => ({ ...prev, [activeAssetLibraryTab]: 'ai' }))
                                  setAiGenViewByTab((prev) => ({ ...prev, [activeAssetLibraryTab]: 'input' }))
                                  setAiGenPromptByTab((prev) => ({
                                    ...prev,
                                    [activeAssetLibraryTab]: curatedQuery[activeAssetLibraryTab].trim() || prev[activeAssetLibraryTab],
                                  }))
                                }}
                                className="text-[11px] text-primary underline"
                              >
                                没找到想要的？去 👉 AI创作 定制专属音效
                              </button>
                            )}
                            {sfxFilteredAssets.length > 0 && (
                              <button
                                onClick={() => {
                                  setLibrarySubTab((prev) => ({ ...prev, [activeAssetLibraryTab]: 'ai' }))
                                  setAiGenViewByTab((prev) => ({ ...prev, [activeAssetLibraryTab]: 'input' }))
                                  setAiGenPromptByTab((prev) => ({
                                    ...prev,
                                    [activeAssetLibraryTab]: curatedQuery[activeAssetLibraryTab].trim() || prev[activeAssetLibraryTab],
                                  }))
                                }}
                                className="pt-1 text-[10px] text-muted-foreground underline"
                              >
                                没找到想要的？去 👉 AI创作
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <textarea
                              value={curatedQuery.music}
                              onChange={(event) => {
                                const next = event.target.value
                                setSmartQueryByTab((prev) => ({ ...prev, music: next }))
                                setCuratedQuery((prev) => ({ ...prev, music: next }))
                              }}
                              placeholder={'输入标签或自然语言描述\n例如：温暖叙事感的木吉他配乐'}
                              className="mb-1 h-14 w-full resize-none rounded-md border border-primary/35 bg-card px-3 py-2 text-[12px] leading-relaxed outline-none focus:border-primary/55"
                            />
                            <div className="mb-1 flex flex-wrap gap-1">
                              {musicNavTags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => setMusicNavTag(tag)}
                                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                                    musicNavTag === tag
                                      ? 'border-primary/40 bg-primary/15 text-primary'
                                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                            {musicFilteredAssets.map((asset) => (
                              <article
                                key={asset.name}
                                onMouseEnter={() => {
                                  setHoverPreviewAsset(asset.name)
                                }}
                                onMouseLeave={() => setHoverPreviewAsset('')}
                                className="rounded-md border border-border bg-card/70 px-2 py-1.5"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <p className="truncate font-medium">{asset.name}</p>
                                  <div className="flex items-center gap-1">
                                    {smartSearchActive && (
                                      <span className="rounded border border-primary/25 bg-primary/10 px-1 py-0.5 text-[10px] text-primary">💡 高优匹配</span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">{asset.name.length + 8}s · {80 + (asset.name.length % 50)}BPM</span>
                                  </div>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {asset.tags.map((tag) => (
                                    <span key={`${asset.name}-${tag}`} className="rounded bg-primary/12 px-1 py-0.5 text-[10px] text-primary">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <div className="mt-1 h-4 rounded bg-[repeating-linear-gradient(90deg,rgba(2,132,199,0.3)_0,rgba(2,132,199,0.3)_2px,transparent_2px,transparent_7px)]" />
                              </article>
                            ))}
                            {musicFilteredAssets.length === 0 && (
                              <button
                                onClick={() => {
                                  setLibrarySubTab((prev) => ({ ...prev, [activeAssetLibraryTab]: 'ai' }))
                                  setAiGenViewByTab((prev) => ({ ...prev, [activeAssetLibraryTab]: 'input' }))
                                  setAiGenPromptByTab((prev) => ({
                                    ...prev,
                                    [activeAssetLibraryTab]: curatedQuery[activeAssetLibraryTab].trim() || prev[activeAssetLibraryTab],
                                  }))
                                }}
                                className="text-[11px] text-primary underline"
                              >
                                没找到想要的？去 👉 AI创作 定制专属音乐
                              </button>
                            )}
                            {musicFilteredAssets.length > 0 && (
                              <button
                                onClick={() => {
                                  setLibrarySubTab((prev) => ({ ...prev, [activeAssetLibraryTab]: 'ai' }))
                                  setAiGenViewByTab((prev) => ({ ...prev, [activeAssetLibraryTab]: 'input' }))
                                  setAiGenPromptByTab((prev) => ({
                                    ...prev,
                                    [activeAssetLibraryTab]: curatedQuery[activeAssetLibraryTab].trim() || prev[activeAssetLibraryTab],
                                  }))
                                }}
                                className="pt-1 text-[10px] text-muted-foreground underline"
                              >
                                没找到想要的？去 👉 AI创作
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-md bg-card/70 p-1">
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            ['input', '输入要求'],
                            ['history', '生成记录'],
                          ].map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => setAiGenViewByTab((prev) => ({ ...prev, [activeAssetLibraryTab]: key as 'input' | 'history' }))}
                              className={`rounded-md px-2 py-1 text-[11px] ${
                                aiGenViewByTab[activeAssetLibraryTab] === key
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-background/80 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {aiGenViewByTab[activeAssetLibraryTab] === 'input' ? (
                        <>
                          <textarea
                            value={aiGenPromptByTab[activeAssetLibraryTab]}
                            onChange={(event) => setAiGenPromptByTab((prev) => ({ ...prev, [activeAssetLibraryTab]: event.target.value }))}
                            placeholder={`请输入描述，如：三个人在雨中泥泞奔跑...`}
                            className="h-20 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[11px] outline-none"
                          />
                          <div>
                            <p className="mb-1 text-[10px] text-muted-foreground">时长</p>
                            <div className="flex gap-1">
                              {(activeAssetLibraryTab === 'music' ? [30, 60, 90] : [3, 5, 10]).map((duration) => (
                                <button
                                  key={duration}
                                  onClick={() => setAiGenDurationByTab((prev) => ({ ...prev, [activeAssetLibraryTab]: duration }))}
                                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                                    aiGenDurationByTab[activeAssetLibraryTab] === duration
                                      ? 'border-primary/40 bg-primary/15 text-primary'
                                      : 'border-border bg-card text-muted-foreground'
                                  }`}
                                >
                                  {duration}秒
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => triggerAssetAiGenerate(activeAssetLibraryTab)}
                            className="w-full rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary"
                          >
                            🪄 立即生成
                          </button>
                          {aiGenResultsByTab[activeAssetLibraryTab].length > 0 && (
                            <div className="space-y-1.5">
                              {aiGenResultsByTab[activeAssetLibraryTab].map((item) => (
                                <article key={item} className="rounded-md border border-border bg-background/70 px-2 py-1.5">
                                  <div className="mb-1 flex items-center justify-between">
                                    <p className="text-[11px] font-medium">{item}</p>
                                    <span className="text-[10px] text-muted-foreground">可拖拽</span>
                                  </div>
                                  <div className="h-4 rounded bg-[repeating-linear-gradient(90deg,rgba(59,130,246,0.35)_0,rgba(59,130,246,0.35)_2px,transparent_2px,transparent_6px)]" />
                                </article>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          {aiGenRecordsByTab[activeAssetLibraryTab].length === 0 && (
                            <p className="rounded-md border border-border bg-background/70 px-2 py-1.5 text-[10px] text-muted-foreground">
                              暂无生成记录
                            </p>
                          )}
                          {aiGenRecordsByTab[activeAssetLibraryTab].map((record) => (
                            <article key={record.id} className="rounded-md border border-border bg-background/80 px-2 py-1.5">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <p className="truncate text-[11px] font-medium">提示词：{record.prompt}</p>
                                <span className="shrink-0 text-[10px] text-muted-foreground">{record.createdAt}</span>
                              </div>
                              <p className="mb-1 text-[10px] text-muted-foreground">时长：{record.duration}秒 · 变体：{record.results.length}</p>
                              <div className="space-y-1">
                                {record.results.map((item) => (
                                  <div key={`${record.id}-${item}`} className="rounded border border-border/80 bg-card/70 px-1.5 py-1">
                                    <div className="mb-0.5 flex items-center justify-between">
                                      <p className="text-[10px]">{item}</p>
                                      <span className="text-[9px] text-muted-foreground">可拖拽</span>
                                    </div>
                                    <div className="h-3 rounded bg-[repeating-linear-gradient(90deg,rgba(59,130,246,0.35)_0,rgba(59,130,246,0.35)_2px,transparent_2px,transparent_6px)]" />
                                  </div>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {assetTab === 'voice' && (
                <>
                  {voiceLibrarySubTab === 'tts' ? (
                    <div className="overflow-hidden rounded-md border border-border bg-background/70">
                      <div className={`flex w-[200%] transition-transform duration-300 ${voiceStage === 'picker' ? '-translate-x-1/2' : 'translate-x-0'}`}>
                        <div className="w-1/2 space-y-2 p-2 text-xs">
                          <textarea
                            value={voiceScript}
                            onChange={(event) => setVoiceScript(event.target.value)}
                            placeholder="请输入或粘贴需要配音的文案台词..."
                            className="h-20 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[11px] outline-none"
                          />
                          <button onClick={() => setVoiceStage('picker')} className="w-full rounded-md border border-border bg-card px-2 py-1 text-left text-[11px]">
                            当前配音师：{voiceActor}（点击更换）
                          </button>
                          <div>
                            <p className="mb-1 text-[10px] text-muted-foreground">情绪：</p>
                            <div className="flex flex-wrap gap-1">
                            {['冷静', '欢快', '悲伤', '恐惧', '厌恶'].map((emotion) => (
                              <button
                                key={emotion}
                                onClick={() => setVoiceEmotion(emotion)}
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] ${voiceEmotion === emotion ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border bg-card'}`}
                              >
                                {emotion}
                              </button>
                            ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] text-muted-foreground">情绪强度：</p>
                            <div className="flex gap-1">
                            {['正常', '很强', '非常强', '尖叫强', '极致强'].map((level) => (
                              <button
                                key={level}
                                onClick={() => setVoiceIntensity(level)}
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] ${voiceIntensity === level ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border bg-card'}`}
                              >
                                {level}
                              </button>
                            ))}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px]"><span>语速</span><span>{voiceSpeed.toFixed(1)}x</span></div>
                            <input type="range" min={0.6} max={2} step={0.1} value={voiceSpeed} onChange={(e) => setVoiceSpeed(Number(e.target.value))} className="h-1.5 w-full accent-[var(--primary)]" />
                          </div>
                          <button onClick={generateVoiceClip} className="w-full rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">🪄 生成语音</button>
                          {voiceResult && <div className="rounded-md border border-border bg-card p-2 text-[11px]">{voiceResult}</div>}
                        </div>
                        <div className="w-1/2 p-2 text-xs">
                          <button onClick={() => setVoiceStage('main')} className="mb-2 rounded-md border border-border px-2 py-0.5 text-[10px]">&lt; 返回</button>
                          <div className="space-y-1">
                            {['魔天河', '陈雨沫', '周野', '林深', '阿木'].map((name) => (
                              <button
                                key={name}
                                onClick={() => {
                                  setVoiceActor(name)
                                  setVoiceStage('main')
                                }}
                                className="w-full rounded-md border border-border bg-card px-2 py-1 text-left text-[11px]"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-md border border-border bg-background/70 p-2 text-xs">
                      <div className="rounded-md bg-card/70 p-1">
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            ['input', '输入要求'],
                            ['history', '生成记录'],
                          ].map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => setAiVoiceView(key as 'input' | 'history')}
                              className={`rounded-md px-2 py-1 text-[11px] ${
                                aiVoiceView === key
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-background/80 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {aiVoiceView === 'input' ? (
                        <>
                          <textarea
                            value={aiVoicePrompt}
                            onChange={(event) => setAiVoicePrompt(event.target.value)}
                            placeholder="请输入声音描述，如：温暖纪录片女声，语速平稳，亲和力强..."
                            className="h-20 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[11px] outline-none"
                          />
                          <div>
                            <p className="mb-1 text-[10px] text-muted-foreground">时长</p>
                            <div className="flex gap-1">
                              {[5, 10, 20].map((duration) => (
                                <button
                                  key={duration}
                                  onClick={() => setAiVoiceDuration(duration)}
                                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                                    aiVoiceDuration === duration
                                      ? 'border-primary/40 bg-primary/15 text-primary'
                                      : 'border-border bg-card text-muted-foreground'
                                  }`}
                                >
                                  {duration}秒
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={triggerAiVoiceGenerate}
                            className="w-full rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary"
                          >
                            🪄 立即生成
                          </button>
                          {aiVoiceResults.length > 0 && (
                            <div className="space-y-1.5">
                              {aiVoiceResults.map((item) => (
                                <article key={item} className="rounded-md border border-border bg-background/70 px-2 py-1.5">
                                  <div className="mb-1 flex items-center justify-between">
                                    <p className="text-[11px] font-medium">{item}</p>
                                    <span className="text-[10px] text-muted-foreground">可拖拽</span>
                                  </div>
                                  <div className="h-4 rounded bg-[repeating-linear-gradient(90deg,rgba(59,130,246,0.35)_0,rgba(59,130,246,0.35)_2px,transparent_2px,transparent_6px)]" />
                                </article>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          {aiVoiceRecords.length === 0 && (
                            <p className="rounded-md border border-border bg-background/70 px-2 py-1.5 text-[10px] text-muted-foreground">
                              暂无生成记录
                            </p>
                          )}
                          {aiVoiceRecords.map((record) => (
                            <article key={record.id} className="rounded-md border border-border bg-background/80 px-2 py-1.5">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <p className="truncate text-[11px] font-medium">提示词：{record.prompt}</p>
                                <span className="shrink-0 text-[10px] text-muted-foreground">{record.createdAt}</span>
                              </div>
                              <p className="mb-1 text-[10px] text-muted-foreground">时长：{record.duration}秒 · 变体：{record.results.length}</p>
                              <div className="space-y-1">
                                {record.results.map((item) => (
                                  <div key={`${record.id}-${item}`} className="rounded border border-border/80 bg-card/70 px-1.5 py-1">
                                    <div className="mb-0.5 flex items-center justify-between">
                                      <p className="text-[10px]">{item}</p>
                                      <span className="text-[9px] text-muted-foreground">可拖拽</span>
                                    </div>
                                    <div className="h-3 rounded bg-[repeating-linear-gradient(90deg,rgba(59,130,246,0.35)_0,rgba(59,130,246,0.35)_2px,transparent_2px,transparent_6px)]" />
                                  </div>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {assetTab === 'my_assets' && (
                <div className="space-y-2 text-xs">
                  <div className="space-y-2 rounded-md bg-background/65 p-2">
                    {myAssetSubTab === 'project' ? (
                      <>
                        <div className="space-y-2">
                          <button className="flex w-full items-center gap-2 rounded-md border border-border bg-card/70 p-2 text-left">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-background/70 text-2xl text-primary">⬆</div>
                            <div>
                              <p className="text-[11px] font-medium">导入媒体</p>
                            </div>
                          </button>
                          {projectAssets.map((asset) => (
                            <article key={asset.id} className="flex items-center gap-2 rounded-md border border-border bg-card/70 p-2">
                              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-background/70 text-2xl text-muted-foreground">
                                {asset.category === 'video' ? '🎬' : asset.category === 'audio' ? '🎵' : '🎧'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[11px] font-medium">{asset.name}</p>
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                  {asset.category === 'video' ? `视频 · ${asset.resolution ?? '-'}` : asset.category === 'audio' ? '原始录音' : '临时产物'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-semibold text-foreground">{asset.duration}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <input
                          ref={personalAssetUploadInputRef}
                          type="file"
                          multiple
                          accept="audio/*"
                          className="hidden"
                          onChange={(event) => {
                            handlePersonalAssetUpload(event.target.files)
                            event.currentTarget.value = ''
                          }}
                        />
                        <div className="flex gap-1 rounded-md bg-card/70 p-1">
                          {[
                            ['all', '全部'],
                            ['music', '音乐'],
                            ['sfx', '音效'],
                          ].map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => setPersonalAssetTypeFilter(key as 'all' | 'music' | 'sfx')}
                              className={`rounded-md px-2 py-1 text-[10px] ${
                                personalAssetTypeFilter === key
                                  ? 'bg-primary/15 text-primary'
                                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => personalAssetUploadInputRef.current?.click()}
                          className="flex w-full items-center justify-between rounded-md border border-dashed border-primary/35 bg-primary/5 px-2 py-1.5 text-left"
                        >
                          <span className="text-[11px] text-foreground">上传音效/音乐</span>
                          <span className="text-[10px] text-primary">AI自动打标</span>
                        </button>
                        <input
                          value={personalAssetQuery}
                          onChange={(event) => setPersonalAssetQuery(event.target.value)}
                          placeholder="输入标签或自然语言描述搜索"
                          className="h-8 w-full rounded-md border border-border bg-card px-2 text-[11px] outline-none focus:border-primary/40"
                        />
                        <div className="space-y-1 rounded-md bg-card/70 p-0">
                          {filteredPersonalAssets.length === 0 && <p className="px-2 py-1.5 text-[10px] text-muted-foreground">没有匹配结果</p>}
                          {filteredPersonalAssets.map((asset) => (
                            <article key={asset.id} className="rounded-md border border-border bg-background px-2 py-1.5">
                              <div className="flex items-center justify-between">
                                <p className="truncate text-[11px] font-medium">{asset.name}</p>
                                <span className="text-[10px] text-muted-foreground">{formatAssetTypeLabel(asset.type)}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {asset.aiTags.map((tag) => (
                                  <span key={`${asset.id}-${tag}`} className="rounded bg-primary/12 px-1 py-0.5 text-[10px] text-primary">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
                </div>
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
                  {hoverPreviewAsset && (
                    <p className="mt-1 text-[11px] text-primary">
                      正在同步预览：{timelineSelectionLabel} · {hoverPreviewAsset}（已启用 Auto-Ducking）
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="mb-1.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold">专业级多轨界面</h2>
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
                    title="添加时间轴视图"
                  >
                    <span className="text-sm leading-none">+</span>
                    <span>添加时间轴视图</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5">
                  {[
                    { key: 'select' as const, icon: '⌖', label: '选择' },
                    { key: 'trim' as const, icon: '✂', label: '裁剪' },
                    { key: 'drag' as const, icon: '✋', label: '拖动' },
                    { key: 'zoom' as const, icon: '🔍', label: '缩放' },
                  ].map((tool) => {
                    const active = timelineTool === tool.key
                    return (
                      <button
                        key={tool.key}
                        onClick={() => setTimelineTool(tool.key)}
                        title={tool.label}
                        className={`flex h-7 w-7 items-center justify-center rounded-md border text-[13px] transition ${
                          active
                            ? 'border-primary/40 bg-primary/15 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>{tool.icon}</span>
                      </button>
                    )
                  })}
                  <span className="ml-1 text-[11px] text-muted-foreground">当前工具：{timelineTool === 'select' ? '选择' : timelineTool === 'trim' ? '裁剪' : timelineTool === 'drag' ? '拖动' : '缩放'}</span>
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
                      {activeMaterial.tracks.map((row, rowIndex) => {
                        const isVoiceRow = row.name.startsWith('人声')
                        if (!isVoiceRow) return renderTrackRow(row)
                        if (rowIndex !== firstVoiceTrackIndex) return null
                        return (
                          <div key={`${activeMaterial.id}-voice-group`} className="border-b border-border/70 bg-sky-100/25">
                            <div
                              onClick={() =>
                                setVoiceGroupCollapsedByMaterial((prev) => ({ ...prev, [activeMaterial.id]: !activeVoiceGroupCollapsed }))
                              }
                              className="grid cursor-pointer grid-cols-[160px_minmax(0,1fr)] border-b border-sky-200/70"
                            >
                              <div className="flex items-center gap-2 bg-sky-100/60 px-2 py-1.5">
                                <span className="text-[11px]">{activeVoiceGroupCollapsed ? '▸' : '▾'}</span>
                                <span className="rounded border border-sky-300/80 bg-sky-200/80 px-1 py-0.5 text-[10px] font-semibold text-sky-900">VOC</span>
                                <div className="min-w-0">
                                  <p className="truncate text-[11px] font-semibold text-sky-900">人声轨道组</p>
                                  <p className="text-[10px] text-sky-800/80">{activeVoiceTracks.length} 位说话人</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between bg-sky-50/80 px-2 py-1.5 text-[10px] text-sky-900/80">
                                <span>说话人轨道分组</span>
                                <span>{activeVoiceGroupCollapsed ? '已折叠' : '展开中'}</span>
                              </div>
                            </div>
                            {!activeVoiceGroupCollapsed && activeVoiceTracks.map((voiceRow) => renderTrackRow(voiceRow, true))}
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
              </div>
              <div className="space-y-2 rounded-md bg-background/70 p-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {assistantQuickPrompts.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => submitAssistantMessage(item.prompt)}
                      className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-[11px] text-foreground hover:border-primary/35 hover:text-primary"
                    >
                      <span>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
                <p className="px-0.5 text-[10px] text-muted-foreground">
                  已选中 {selectedClipCount} 个片段，当前焦点：{assistantFocusLabel}
                </p>

                {(assistantMessages.length > 0 || assistantThinking) && (
                  <div ref={assistantScrollContainerRef} className="max-h-[360px] space-y-2 overflow-y-auto rounded-md bg-card/60 p-2 pr-1">
                    {assistantMessages.map((message) => (
                    <article
                      key={message.id}
                      className={`rounded-md p-2.5 text-xs leading-relaxed ${
                        message.role === 'user'
                          ? 'ml-5 bg-primary/10 text-foreground'
                          : 'mr-5 bg-background text-foreground'
                      }`}
                    >
                      {message.role === 'assistant' && <p className="mb-1 text-[10px] font-semibold text-muted-foreground">AI 助手</p>}
                      <p>{message.text}</p>
                      {message.proofreadItems && message.proofreadItems.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.proofreadItems.map((item) => (
                            <div key={item.id} className="rounded-md border border-border bg-card/70 p-2">
                              <div className="flex items-center gap-1.5">
                                <span>{item.icon}</span>
                                <span className={`font-semibold ${item.levelColorClass}`}>{item.levelLabel}</span>
                              </div>
                              <p className="mt-1 text-[10px] text-muted-foreground">{item.time}</p>
                              <p className="mt-1">{item.description}</p>
                              <p className="mt-1 text-[10px] text-muted-foreground">{item.trackLabel}</p>
                              {item.originalText && item.recognizedText && (
                                <p className="mt-1 text-[10px]">
                                  原文：{item.originalText} | 识别：{item.recognizedText}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {message.musicSuggestion && (
                        <div className="mt-2 space-y-2 rounded-md bg-primary/5 p-2">
                          <div>
                            <p className="font-semibold text-[11px]">建议一：垫入情绪 BGM</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">推荐 3 首温暖讲述类配乐。</p>
                            <div className="mt-1.5 space-y-1">
                              {message.musicSuggestion.tracks.map((track) => (
                                <button
                                  key={track}
                                  onClick={() => undefined}
                                  className="flex w-full items-center justify-start gap-1 rounded bg-card px-2 py-1 text-[10px] hover:bg-primary/5"
                                >
                                  <span>▶ 试听</span>
                                  <span>{track}</span>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setAssetTab('music')
                              }}
                              className="mt-1.5 rounded bg-primary/10 px-2 py-1 text-[10px] text-primary"
                            >
                              一键添加到新轨道
                            </button>
                          </div>

                          <div className="pt-1.5">
                            <p className="font-semibold text-[11px]">建议二：应用温暖讲述 EQ</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">降低亮度、增强低频共鸣。</p>
                            <button
                              onClick={() => undefined}
                              className="mt-1.5 rounded bg-primary/10 px-2 py-1 text-[10px] text-primary"
                            >
                              应用“温暖讲述”EQ预设
                            </button>
                          </div>

                          <div className="pt-1.5">
                            <p className="font-semibold text-[11px]">建议三：重生成/标记重录</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">从源头修复语速语气。</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <button
                                onClick={() => undefined}
                                className="rounded bg-primary/10 px-2 py-1 text-[10px] text-primary"
                              >
                                使用现有音色重生成（温暖参数）
                              </button>
                              <button
                                onClick={() => undefined}
                                className="rounded bg-card px-2 py-1 text-[10px]"
                              >
                                生成重录批注单
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                    ))}
                    {assistantThinking && (
                      <div className="mr-5 rounded-md bg-background p-2 text-xs">
                        <p className="mb-1 text-[10px] font-semibold text-muted-foreground">AI 正在综合判断...</p>
                        <div className="space-y-1">
                          {assistantThinkingSteps.map((step, index) => (
                            <p key={step} className={assistantThinkingStep > index ? 'text-foreground' : 'text-muted-foreground'}>
                              ✔️ {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={assistantScrollAnchorRef} />
                  </div>
                )}

                <div className="rounded-md bg-card/70 p-2">
                  <div className="relative">
                    <textarea
                      value={assistantInput}
                      onChange={(event) => setAssistantInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          submitAssistantMessage()
                        }
                      }}
                      placeholder="可点击上方快捷指令，或在下方输入自然语言问题。例如：这段日军进村的画面，配现在的脚步声合适吗？"
                      className="h-20 w-full resize-none rounded-md border border-primary/35 bg-background px-2 py-1.5 pr-16 text-xs outline-none focus:border-primary/55"
                    />
                    <button
                      onClick={() => submitAssistantMessage()}
                      disabled={!assistantInput.trim() || assistantThinking}
                      className={`rounded-md px-2.5 py-1 text-[11px] ${
                        !assistantInput.trim() || assistantThinking
                          ? 'cursor-not-allowed bg-muted/40 text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                      style={{ position: 'absolute', right: '8px', bottom: '8px' }}
                    >
                      发送
                    </button>
                  </div>
                </div>
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

                  {selectedTrackMeta?.type !== 'video' && (
                    <div className="rounded-md border border-border bg-background/70 p-2">
                      {selectedTrackMeta?.type === 'bgm' && (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium">AI音乐延展</p>
                          <button className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary">
                            执行延展
                          </button>
                        </div>
                      )}
                      {selectedTrackMeta?.type === 'sfx' && (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium">AI音效修改</p>
                          <button className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary">
                            智能修改
                          </button>
                        </div>
                      )}
                      {selectedTrackMeta?.type === 'voice' && (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium">AI音色替换</p>
                          <button className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary">
                            选择替换
                          </button>
                        </div>
                      )}
                    </div>
                  )}

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
