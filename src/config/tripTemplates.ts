import type { TripItemType } from '../api/tripItem'

/** 模板条目（精简版：无坐标/地址，用户创建后可自行搜索 POI 补全）。 */
export interface TemplateItem {
  type: TripItemType
  name: string
  time?: string
  notes?: string
}

/** 行程模板：发现页展示 + create 页预填。硬约束：每模板总条目 ≤ 15（写接口限流 20 次/分钟）。 */
export interface TripTemplate {
  id: string
  title: string
  destination: string
  /** 行程天数（1..30），endDate 由 addDays(startDate, days - 1) 推导 */
  days: number
  theme: string
  transport: string
  /** 与 create 页 coverPresets 保持一致的封面色 */
  coverColor: string
  /** 发现页卡片亮点标签（2~3 个） */
  highlights: string[]
  /** 按天下标的条目二维数组：dayItems.length ≤ days，下标 0 = Day 1 */
  dayItems: TemplateItem[][]
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    id: 'tokyo-5d',
    title: '东京 5 日经典自由行',
    destination: '东京',
    days: 5,
    theme: '自由行',
    transport: '飞机',
    coverColor: '#FF385C',
    highlights: ['浅草寺', '晴空塔', '筑地市场'],
    dayItems: [
      [
        { type: 'sight', name: '浅草寺', time: '09:00', notes: '早点去避开人流' },
        { type: 'sight', name: '东京晴空塔', time: '13:00' },
        { type: 'food', name: '浅草居酒屋晚餐', time: '18:30' },
      ],
      [
        { type: 'sight', name: '明治神宫', time: '09:30' },
        { type: 'sight', name: '原宿竹下通', time: '13:00' },
        { type: 'sight', name: '涩谷十字路口', time: '17:00' },
      ],
      [
        { type: 'food', name: '筑地场外市场', time: '08:00', notes: '海鲜早餐' },
        { type: 'sight', name: '银座', time: '13:00' },
        { type: 'sight', name: '东京塔', time: '18:00' },
      ],
      [
        { type: 'sight', name: '新宿御苑', time: '09:30' },
        { type: 'sight', name: '吉卜力美术馆', notes: '需提前数月预约' },
        { type: 'food', name: '思出横丁', time: '19:00' },
      ],
      [
        { type: 'sight', name: '上野公园', time: '09:00' },
        { type: 'food', name: '阿美横町', time: '12:00' },
        { type: 'transport', name: '前往机场返程', time: '15:00' },
      ],
    ],
  },
  {
    id: 'chengdu-3d-food',
    title: '成都 3 日美食之旅',
    destination: '成都',
    days: 3,
    theme: '美食之旅',
    transport: '高铁',
    coverColor: '#b45309',
    highlights: ['火锅', '大熊猫基地', '鹤鸣茶社'],
    dayItems: [
      [
        { type: 'sight', name: '宽窄巷子', time: '10:00' },
        { type: 'food', name: '老火锅晚餐', time: '18:00' },
        { type: 'sight', name: '九眼桥夜景', time: '20:30' },
      ],
      [
        { type: 'sight', name: '大熊猫繁育基地', time: '08:00', notes: '开园即入，熊猫最活跃' },
        { type: 'sight', name: '武侯祠', time: '14:00' },
        { type: 'food', name: '锦里小吃', time: '17:30' },
      ],
      [
        { type: 'food', name: '人民公园鹤鸣茶社', time: '09:30' },
        { type: 'sight', name: '杜甫草堂', time: '13:30' },
        { type: 'food', name: '建设路小吃街', time: '18:00' },
      ],
    ],
  },
  {
    id: 'beijing-3d',
    title: '北京 3 日经典打卡',
    destination: '北京',
    days: 3,
    theme: '经典打卡',
    transport: '高铁',
    coverColor: '#1e3a5f',
    highlights: ['故宫', '长城', '颐和园'],
    dayItems: [
      [
        { type: 'sight', name: '天安门广场', time: '08:30', notes: '看升旗需更早' },
        { type: 'sight', name: '故宫博物院', time: '09:30', notes: '提前网上购票' },
        { type: 'sight', name: '景山公园', time: '16:00', notes: '俯瞰故宫全景' },
      ],
      [
        { type: 'sight', name: '八达岭长城', time: '08:00' },
        { type: 'sight', name: '南锣鼓巷', time: '15:30' },
        { type: 'food', name: '烤鸭晚餐', time: '18:00' },
      ],
      [
        { type: 'sight', name: '颐和园', time: '09:00' },
        { type: 'sight', name: '圆明园', time: '14:00' },
        { type: 'sight', name: '什刹海', time: '17:30' },
      ],
    ],
  },
  {
    id: 'xian-3d',
    title: '西安 3 日古都漫游',
    destination: '西安',
    days: 3,
    theme: '历史人文',
    transport: '高铁',
    coverColor: '#7b2d8e',
    highlights: ['兵马俑', '城墙骑行', '大唐不夜城'],
    dayItems: [
      [
        { type: 'sight', name: '西安城墙', time: '09:00', notes: '可租自行车骑行' },
        { type: 'food', name: '回民街', time: '12:30' },
        { type: 'sight', name: '钟鼓楼', time: '17:00' },
      ],
      [
        { type: 'sight', name: '兵马俑', time: '08:30', notes: '建议请讲解' },
        { type: 'sight', name: '华清宫', time: '14:00' },
        { type: 'food', name: '永兴坊', time: '18:00', notes: '摔碗酒打卡' },
      ],
      [
        { type: 'sight', name: '陕西历史博物馆', time: '09:00', notes: '需提前预约' },
        { type: 'sight', name: '大雁塔', time: '14:30' },
        { type: 'sight', name: '大唐不夜城', time: '19:00' },
      ],
    ],
  },
  {
    id: 'qingdao-3d',
    title: '青岛 3 日海滨度假',
    destination: '青岛',
    days: 3,
    theme: '海滨度假',
    transport: '高铁',
    coverColor: '#2d6a4f',
    highlights: ['栈桥', '崂山', '啤酒博物馆'],
    dayItems: [
      [
        { type: 'sight', name: '栈桥', time: '09:00' },
        { type: 'sight', name: '八大关', time: '13:30' },
        { type: 'food', name: '台东夜市', time: '18:30' },
      ],
      [
        { type: 'sight', name: '崂山', time: '08:30' },
        { type: 'food', name: '青岛啤酒博物馆', time: '14:00', notes: '含原浆品尝' },
        { type: 'sight', name: '五四广场', time: '18:00' },
      ],
      [
        { type: 'sight', name: '金沙滩', time: '09:30' },
        { type: 'food', name: '劈柴院', time: '12:30' },
        { type: 'transport', name: '返程', time: '16:00' },
      ],
    ],
  },
  {
    id: 'dali-4d',
    title: '大理 4 日慢生活',
    destination: '大理',
    days: 4,
    theme: '慢生活',
    transport: '飞机',
    coverColor: '#2d6a4f',
    highlights: ['洱海骑行', '苍山', '双廊'],
    dayItems: [
      [
        { type: 'sight', name: '大理古城', time: '14:00' },
        { type: 'food', name: '古城夜市', time: '19:00' },
      ],
      [
        { type: 'sight', name: '洱海环湖骑行', time: '09:00' },
        { type: 'sight', name: '喜洲古镇', time: '14:00' },
        { type: 'food', name: '白族三道茶', time: '16:30' },
      ],
      [
        { type: 'sight', name: '苍山索道', time: '09:00' },
        { type: 'sight', name: '双廊古镇', time: '15:00' },
      ],
      [
        { type: 'sight', name: '崇圣寺三塔', time: '09:30' },
        { type: 'transport', name: '返程', time: '16:00' },
      ],
    ],
  },
  {
    id: 'shanghai-3d',
    title: '上海 3 日都市漫步',
    destination: '上海',
    days: 3,
    theme: '都市漫步',
    transport: '高铁',
    coverColor: '#be123c',
    highlights: ['外滩', '迪士尼', '武康路'],
    dayItems: [
      [
        { type: 'sight', name: '外滩', time: '09:00' },
        { type: 'sight', name: '南京路步行街', time: '13:00' },
        { type: 'sight', name: '豫园城隍庙', time: '16:30' },
      ],
      [
        { type: 'sight', name: '上海迪士尼乐园', time: '08:00', notes: '提前购票 + 早起排队' },
        { type: 'sight', name: '陆家嘴天际线', time: '19:30' },
      ],
      [
        { type: 'sight', name: '武康路', time: '10:00' },
        { type: 'sight', name: '田子坊', time: '14:00' },
        { type: 'food', name: '生煎小笼晚餐', time: '18:00' },
      ],
    ],
  },
]
