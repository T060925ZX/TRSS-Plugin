import QR from "qrcode"
import sharp from 'sharp'


class BApi {
    constructor() {}

    async getloginqrcode(url, e) {
        try {
            logger.mark('[二维码美化] 开始生成美化二维码')
            
            // 生成渐变背景色
            function getGradientColors() {
                const colors = [
                    ['#FF9EAA', '#FFE5CC'], // 粉色系
                    ['#A0E7E5', '#B4F8C8'], // 青绿色系
                    ['#FBE7C6', '#FFAEBC'], // 暖色系
                    ['#D4A5A5', '#F4E7E7'], // 玫瑰色系
                    ['#C7CEEA', '#E2F0CB']  // 蓝紫色系
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }
            
            const gradientColors = getGradientColors();
            logger.mark(`[二维码美化] 使用配色方案: ${gradientColors[0]} -> ${gradientColors[1]}`)
            
            // 生成带颜色的二维码
            const qrBuffer = await QR.toBuffer(url, {
                color: {
                    dark: '#2C3E50',  // 深蓝色代替纯黑，更柔和
                    light: gradientColors[1]  // 使用渐变的浅色作为背景
                },
                margin: 2,
                scale: 12,  // 增加缩放比例以提高清晰度
                width: 500,
                height: 500,
                errorCorrectionLevel: 'H'  // 高纠错级别，允许更大的中心logo
            })
            logger.mark('[二维码美化] 二维码生成成功')
            
            // 尝试获取并处理头像（可选步骤，失败不影响二维码生成）
            let processedAvatar = null;
            try {
                const avatarUrl = await e.bot.pickFriend(e.user_id).getAvatarUrl()
                logger.mark('[二维码美化] 正在获取用户头像')
                
                const response = await fetch(avatarUrl);
                if (!response.ok) throw new Error('Failed to fetch avatar')
                const arrayBuffer = await response.arrayBuffer()
                const avatarImage = Buffer.from(arrayBuffer)
                
                // 调整头像大小并添加圆形裁剪
                let avatarBuf = await sharp(avatarImage)
                    .resize(100, 100)
                    .toFormat('png')
                    .toBuffer();
                
                // 创建圆形遮罩
                const circleMask = await sharp({
                    create: {
                        width: 100,
                        height: 100,
                        channels: 4,
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    }
                })
                .composite([{
                    input: Buffer.from(
                        `<svg><circle cx="50" cy="50" r="50" fill="white"/></svg>`
                    ),
                    blend: 'dest-in'
                }])
                .toBuffer();
                
                // 应用圆形遮罩
                avatarBuf = await sharp(avatarBuf)
                    .composite([{ input: circleMask, blend: 'dest-in' }])
                    .toBuffer();
                
                // 添加白色边框
                processedAvatar = await sharp({
                    create: {
                        width: 110,
                        height: 110,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    }
                })
                .composite([{
                    input: avatarBuf,
                    left: 5,
                    top: 5
                }])
                .png()
                .toBuffer();
                
                logger.mark('[二维码美化] 头像处理成功')
            } catch (error) {
                logger.warn('[二维码美化] 头像处理失败，将生成不带头像的二维码', error.message)
                processedAvatar = null;
            }
            
            logger.mark('[二维码美化] 正在合成最终图像')
            // 创建最终图像，添加装饰性边框
            const finalImage = await sharp({
                    create: {
                        width: 520,  // 增加尺寸以容纳边框
                        height: 520,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    }
                })
                .composite([
                    // 添加装饰性外框
                    {
                        input: Buffer.from(
                            `<svg width="520" height="520">
                                <defs>
                                    <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:${gradientColors[0]};stop-opacity:1" />
                                        <stop offset="100%" style="stop-color:${gradientColors[1]};stop-opacity:1" />
                                    </linearGradient>
                                </defs>
                                <rect x="0" y="0" width="520" height="520" rx="20" ry="20" fill="url(#borderGradient)"/>
                                <rect x="10" y="10" width="500" height="500" rx="15" ry="15" fill="white"/>
                            </svg>`
                        ),
                        left: 0,
                        top: 0
                    },
                    // 放置二维码
                    {
                        input: qrBuffer,
                        left: 20,
                        top: 20
                    },
                    // 放置头像（如果存在）
                    ...(processedAvatar ? [{
                        input: processedAvatar,
                        left: 205,  // 调整位置以适应新布局
                        top: 205,
                        blend: 'over'
                    }] : [])
                ])
                .png()
                .toBuffer()
            
            logger.mark('[二维码美化] 二维码生成完成')
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
            // 即使失败也尝试生成一个基本的彩色二维码
            try {
                logger.mark('[二维码美化] 尝试生成备用彩色二维码')
                const qrBuffer = await QR.toBuffer(url, {
                    color: {
                        dark: '#2C3E50',
                        light: '#FFFFFF'
                    },
                    margin: 2,
                    scale: 12,
                    width: 500,
                    height: 500,
                    errorCorrectionLevel: 'H'
                })
                
                const finalImage = await sharp({
                    create: {
                        width: 520,
                        height: 520,
                        channels: 4,
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    }
                })
                .composite([{
                    input: qrBuffer,
                    left: 20,
                    top: 20
                }])
                .png()
                .toBuffer()
                
                const base64String = finalImage.toString('base64')
                logger.mark('[二维码美化] 备用彩色二维码生成成功')
                return {
                    code: 0,
                    msg: "ok",
                    data: {
                        base64: `base64://${base64String}`
                    }
                };
            } catch (fallbackError) {
                logger.error('[二维码美化] 备用方案也失败', fallbackError)
                return {
                    code: -1,
                    msg: error.message || "QR code generation failed",
                    data: null
                };
            }
        }
    }
}

export default new BApi()