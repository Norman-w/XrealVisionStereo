//
// Created by Norman Wang on 2025/5/2.
//

#include "CommandHelper.h"

#include <string>

#include "Utils.h"

/**
* 将字符串转换为字节数组
* @param str - 输入字符串
* @return - 转换后的字节数组
*/
std::vector<uint8_t> CommandHelper::strToPayload(const std::string &str) {
    std::vector<uint8_t> result(str.begin(), str.end());
    return result;
}

/**
 * 构建自定义显示模式命令
 * 允许完全自定义所有参数以测试不同组合
 *
 * @param msgId - 消息ID (如0x0008)
 * @param mode - 主要模式值 (位置22的值)
 * @param subMode - 子模式/附加参数1 (位置23的值)
 * @param param1 - 分辨率参数1 (位置24的值)
 * @param param2 - 分辨率参数2 (位置25的值)
 * @param refresh - 刷新率参数 (位置26的值)
 * @param length - 命令数据长度 (默认0x18=24)
 * @return - 构造好的命令
 */
std::vector<uint8_t> CommandHelper::buildCustomDisplayCommand(
    const uint16_t msgId,
    const uint8_t mode,
    const uint8_t subMode,
    const uint8_t param1,
    const uint8_t param2,
    const uint8_t refresh,
    const uint16_t length
) {
    // 构造基本命令结构
    std::vector<uint8_t> buffer(64, 0);  // 初始化64字节缓冲区，填充0

    // 设置基本字段
    buffer[0] = 0xFD;  // 命令头标识

    // 设置随机序列号
    const uint32_t seqNum = Utils::generateRandomU32();
    // const uint32_t seqNum =  402284073;//Utils::generateRandomU32();
    buffer[7] = seqNum & 0xFF;
    buffer[8] = (seqNum >> 8) & 0xFF;
    buffer[9] = (seqNum >> 16) & 0xFF;
    buffer[10] = (seqNum >> 24) & 0xFF;

    // 设置消息ID
    buffer[15] = msgId & 0xFF;
    buffer[16] = (msgId >> 8) & 0xFF;

    // 设置长度字段
    buffer[5] = length & 0xFF;
    buffer[6] = (length >> 8) & 0xFF;

    // 设置主要模式参数
    buffer[22] = mode;

    // 设置附加参数
    if (length > 0x12) {
        buffer[23] = subMode;

        if (length > 0x13) {
            buffer[24] = param1;

            if (length > 0x14) {
                buffer[25] = param2;

                if (length > 0x15) {
                    buffer[26] = refresh;
                }
            }
        }
    }

    // 计算CRC校验
    uint32_t crc = Utils::calculateCRC32(&buffer[5], length);
    buffer[1] = crc & 0xFF;
    buffer[2] = (crc >> 8) & 0xFF;
    buffer[3] = (crc >> 16) & 0xFF;
    buffer[4] = (crc >> 24) & 0xFF;

    return buffer;
}