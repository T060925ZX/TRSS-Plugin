import QR from "qrcode"
import sharp from 'sharp'


class BApi {
    constructor() {}

    async getloginqrcode(url, e) {
        try {
            const avatarUrl = await e.bot.pickFriend(e.user_id).getAvatarUrl()
            function getRandomColor(baseColor = [255, 145, 164], variation = 8) {
                const [baseR, baseG, baseB] = baseColor;
                const r = Math.max(0, Math.min(baseR + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0')
                const g = Math.max(0, Math.min(baseG + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0')
                const b = Math.max(0, Math.min(baseB + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16)
                    .padStart(2, '0')
                return `#${r}${g}${b}`
            }
            const qrBuffer = await QR.toBuffer(url, {
                color: {
                    dark: '#000000',
                    light: getRandomColor()
                },
                margin: 1,
                scale: 10,
                width: 400,
                height: 400
            })
            let avatarImage
            try {
                const response = await fetch(avatarUrl);
                if (!response.ok) throw new Error('Failed to fetch avatar')
                const arrayBuffer = await response.arrayBuffer()
                avatarImage = Buffer.from(arrayBuffer)
            } catch (error) {
                logger.error('无法获取用户头像', error)
                avatarImage = null;
            }
            const compositeImages = [{ input: qrBuffer }]
            if (avatarImage) {
                const processedAvatar = await sharp(avatarImage)
                    .resize(120, 120)
                    .toBuffer();
                
                compositeImages.push({
                    input: processedAvatar,
                    left: 140,
                    top: 140,
                    blend: 'over'
                });
            }
            const finalImage = await sharp({
                    create: {
                        width: 400,
                        height: 400,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    }
                })
                .composite(compositeImages)
                .png()
                .toBuffer()
            const base64String = finalImage.toString('base64')
            return {
                code: 0,
                msg: "ok",
                data: {
                    base64: `base64://${base64String}`
                }
            };
    
        } catch (error) {
            logger.error('[生成定制米游社登录二维码失败]', error)
            return {
                code: -1,
                msg: error.message || "QR code generation failed",
                data: null
            };
        }
    }
}

export default new BApi()