export interface UnicodeEmoji {
  char: string
  name: string
  zh: string
}

// Curated subset for the picker. Unknown `:shortcode:` stays literal.
export const UNICODE_EMOJIS: UnicodeEmoji[] = [
  { char: `😀`, name: `grinning`, zh: `咧嘴笑` },
  { char: `😃`, name: `smiley`, zh: `大笑` },
  { char: `😄`, name: `smile`, zh: `开心笑` },
  { char: `😁`, name: `grin`, zh: `露齿笑` },
  { char: `😆`, name: `laughing`, zh: `大笑` },
  { char: `😅`, name: `sweat_smile`, zh: `苦笑` },
  { char: `🤣`, name: `rofl`, zh: `笑翻` },
  { char: `😂`, name: `joy`, zh: `笑哭` },
  { char: `🙂`, name: `slightly_smiling_face`, zh: `微笑` },
  { char: `😉`, name: `wink`, zh: `眨眼` },
  { char: `😊`, name: `blush`, zh: `害羞` },
  { char: `😍`, name: `heart_eyes`, zh: `花痴` },
  { char: `😘`, name: `kissing_heart`, zh: `飞吻` },
  { char: `🥰`, name: `smiling_face_with_hearts`, zh: `爱心笑` },
  { char: `🤩`, name: `star_struck`, zh: `星星眼` },
  { char: `😎`, name: `sunglasses`, zh: `墨镜` },
  { char: `🤓`, name: `nerd_face`, zh: `书呆子` },
  { char: `🧐`, name: `monocle`, zh: `单片眼镜` },
  { char: `🤔`, name: `thinking`, zh: `思考` },
  { char: `🤨`, name: `raised_eyebrow`, zh: `挑眉` },
  { char: `😐`, name: `neutral_face`, zh: `面无表情` },
  { char: `😑`, name: `expressionless`, zh: `无语` },
  { char: `😏`, name: `smirk`, zh: `坏笑` },
  { char: `🙄`, name: `roll_eyes`, zh: `翻白眼` },
  { char: `😪`, name: `sleepy`, zh: `困` },
  { char: `😴`, name: `sleeping`, zh: `睡觉` },
  { char: `🤤`, name: `drooling_face`, zh: `流口水` },
  { char: `😷`, name: `mask`, zh: `口罩` },
  { char: `🤒`, name: `face_with_thermometer`, zh: `发烧` },
  { char: `🥵`, name: `hot_face`, zh: `热` },
  { char: `🥶`, name: `cold_face`, zh: `冷` },
  { char: `🥺`, name: `pleading_face`, zh: `可怜` },
  { char: `😢`, name: `cry`, zh: `流泪` },
  { char: `😭`, name: `sob`, zh: `大哭` },
  { char: `😱`, name: `scream`, zh: `吓` },
  { char: `😡`, name: `rage`, zh: `生气` },
  { char: `🤯`, name: `exploding_head`, zh: `炸裂` },
  { char: `🥳`, name: `partying_face`, zh: `庆祝` },
  { char: `😇`, name: `innocent`, zh: `天使` },
  { char: `🤠`, name: `cowboy`, zh: `牛仔` },
  { char: `🤡`, name: `clown`, zh: `小丑` },
  { char: `💀`, name: `skull`, zh: `骷髅` },
  { char: `👍`, name: `thumbsup`, zh: `点赞` },
  { char: `👎`, name: `thumbsdown`, zh: `踩` },
  { char: `👏`, name: `clap`, zh: `鼓掌` },
  { char: `🙌`, name: `raised_hands`, zh: `举手` },
  { char: `🙏`, name: `pray`, zh: `合十` },
  { char: `👌`, name: `ok_hand`, zh: `OK` },
  { char: `✌️`, name: `v`, zh: `胜利` },
  { char: `🤝`, name: `handshake`, zh: `握手` },
  { char: `💪`, name: `muscle`, zh: `肌肉` },
  { char: `👋`, name: `wave`, zh: `挥手` },
  { char: `✊`, name: `fist`, zh: `拳头` },
  { char: `🤟`, name: `love_you`, zh: `爱你手势` },
  { char: `❤️`, name: `heart`, zh: `红心` },
  { char: `🧡`, name: `orange_heart`, zh: `橙心` },
  { char: `💛`, name: `yellow_heart`, zh: `黄心` },
  { char: `💚`, name: `green_heart`, zh: `绿心` },
  { char: `💙`, name: `blue_heart`, zh: `蓝心` },
  { char: `💜`, name: `purple_heart`, zh: `紫心` },
  { char: `🖤`, name: `black_heart`, zh: `黑心` },
  { char: `💔`, name: `broken_heart`, zh: `心碎` },
  { char: `❤️‍🔥`, name: `heart_on_fire`, zh: `火热的心` },
  { char: `💘`, name: `cupid`, zh: `丘比特` },
  { char: `💯`, name: `100`, zh: `满分` },
  { char: `🔥`, name: `fire`, zh: `火` },
  { char: `🎉`, name: `tada`, zh: `礼花` },
  { char: `🎂`, name: `birthday`, zh: `生日蛋糕` },
  { char: `🎁`, name: `gift`, zh: `礼物` },
  { char: `🏆`, name: `trophy`, zh: `奖杯` },
  { char: `⭐`, name: `star`, zh: `星` },
  { char: `✨`, name: `sparkles`, zh: `闪光` },
  { char: `💡`, name: `bulb`, zh: `灯泡` },
  { char: `✅`, name: `white_check_mark`, zh: `对勾` },
  { char: `❌`, name: `x`, zh: `叉` },
  { char: `❓`, name: `question`, zh: `问号` },
  { char: `❗`, name: `exclamation`, zh: `感叹号` },
  { char: `💤`, name: `zzz`, zh: `睡` },
  { char: `💩`, name: `poop`, zh: `便便` },
  { char: `👀`, name: `eyes`, zh: `眼睛` },
  { char: `🎨`, name: `art`, zh: `调色板` },
  { char: `🚀`, name: `rocket`, zh: `火箭` },
  { char: `☕`, name: `coffee`, zh: `咖啡` },
  { char: `🍉`, name: `watermelon`, zh: `西瓜` },
  { char: `🌹`, name: `rose`, zh: `玫瑰` },
  { char: `🌈`, name: `rainbow`, zh: `彩虹` },
  { char: `🎵`, name: `music`, zh: `音乐` },
  { char: `📌`, name: `pushpin`, zh: `图钉` },
]

export const UNICODE_SHORTCODES: Record<string, string> = Object.fromEntries(
  UNICODE_EMOJIS.map(item => [item.name, item.char]),
)

export function filterUnicodeEmojis(query: string): UnicodeEmoji[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return UNICODE_EMOJIS
  }
  return UNICODE_EMOJIS.filter((item) => {
    return item.char === q
      || item.name.includes(q)
      || item.zh.includes(query.trim())
  })
}
