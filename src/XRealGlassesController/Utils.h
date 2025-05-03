//
// Created by Norman Wang on 2025/5/2.
//

#ifndef UTILS_H
#define UTILS_H
#include <array>
#include <cstdint>

#include "LOG_LEVEL.h"


class Utils {
public:
    // CRC32表（用于快速CRC计算）
    static const std::array<uint32_t, 256> CRC32_TABLE;
    /**
         * 计算CRC32校验和
         * @param data - 要计算校验和的数据
         * @param length - 数据长度
         * @return - 计算得到的CRC32值
         */
    static uint32_t calculateCRC32(const uint8_t *data, size_t length);

    /**
     * 生成随机32位整数
     * @return - 随机32位整数
     */
    static uint32_t generateRandomU32();

    /**
     * 记录日志
     * @param message - 日志消息
     * @param level - 日志级别
     */
    static void log(const std::string& message, LogLevel level = LogLevel::INFO);

    static std::string bytesToHex(const std::vector<uint8_t> & vector);
};


#endif //UTILS_H
