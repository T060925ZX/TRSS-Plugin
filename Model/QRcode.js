import QR from "qrcode"
import sharp from 'sharp'

class BApi {
    constructor() {}

    /**
     * 生成美化后的米游社登录二维码
     * @param {string} url 二维码链接
     * @param {object} e 消息对象
     */
    async getloginqrcode(url, e) {
        try {
            // --- 保持原有头像获取方案 ---
            const avatarUrl = await e.bot.pickFriend(e.user_id).getAvatarUrl()
            
            // 颜色生成逻辑
            function getRandomColor(baseColor = [255, 145, 164], variation = 8) {
                const [baseR, baseG, baseB] = baseColor;
                const r = Math.max(0, Math.min(baseR + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16).padStart(2, '0')
                const g = Math.max(0, Math.min(baseG + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16).padStart(2, '0')
                const b = Math.max(0, Math.min(baseB + Math.floor(Math.random() * (variation * 2 + 1)) - variation, 255))
                    .toString(16).padStart(2, '0')
                return `#${r}${g}${b}`
            }

            const lightBg = getRandomColor(); // 浅色背景

            // 1. 生成高纠错率的二维码 (ErrorCorrectionLevel: H 是关键，保证中心遮挡后仍能识别)
            const qrBuffer = await QR.toBuffer(url, {
                color: {
                    dark: '#2c2c2c', // 深色点阵，对比度更高
                    light: lightBg   // 随机浅色背景
                },
                margin: 1,
                scale: 10,
                width: 400,
                height: 400,
                errorCorrectionLevel: 'H' 
            });

            // 2. 获取并处理头像
            let avatarBuffer;
            try {
                const response = await fetch(avatarUrl);
                if (!response.ok) throw new Error('Fetch failed');
                const arrayBuffer = await response.arrayBuffer();
                avatarBuffer = Buffer.from(arrayBuffer);
            } catch (error) {
                logger.error('[QR] 无法获取用户头像，将使用纯白填充', error);
                avatarBuffer = null;
            }

            const compositeImages = [{ input: qrBuffer }];

            if (avatarBuffer) {
                const avatarSize = 100; // 头像大小
                const borderSize = 110; // 边框大小
                const cornerRadius = 20; // 圆角半径

                // 制作带圆角的白底边框
                const whiteRect = Buffer.from(
                    `<svg><rect x="0" y="0" width="${borderSize}" height="${borderSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white" /></svg>`
                );

                // 制作圆角头像
                const roundedAvatar = await sharp(avatarBuffer)
                    .resize(avatarSize, avatarSize)
                    .composite([{
                        input: Buffer.from(
                            `<svg><rect x="0" y="0" width="${avatarSize}" height="${avatarSize}" rx="${cornerRadius-5}" ry="${cornerRadius-5}" fill="white" /></svg>`
                        ),
                        blend: 'dest-in'
                    }])
                    .png()
                    .toBuffer();

                // 先放白色背景块
                compositeImages.push({
                    input: whiteRect,
                    top: 145, // (400 - 110) / 2
                    left: 145,
                    blend: 'over'
                });

                // 再放头像
                compositeImages.push({
                    input: roundedAvatar,
                    top: 150, // (400 - 100) / 2
                    left: 150,
                    blend: 'over'
                });
            }

            // 3. 最终合成
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
            .toBuffer();

            const base64String = finalImage.toString('base64');
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