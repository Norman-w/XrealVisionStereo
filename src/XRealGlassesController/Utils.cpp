//
// Created by Norman Wang on 2025/5/2.
//

#include "Utils.h"

#include <array>
#include <iostream>
#include <random>

#include "LOG_LEVEL.h"


//================ CRC32相关 ================//
// 初始化CRC32表
const std::array<uint32_t, 256> Utils::CRC32_TABLE = []() {
    std::array<uint32_t, 256> table{};
    for (uint32_t i = 0; i < 256; i++) {
        uint32_t c = i;
        for (uint32_t j = 0; j < 8; j++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >> 1)) : (c >> 1));
        }
        table[i] = c;
    }
    return table;
}();

/**
 * 计算CRC32校验和
 * @param data - 要计算校验和的数据
 * @param length - 数据长度
 * @return - 计算得到的CRC32值
 */
uint32_t Utils::calculateCRC32(const uint8_t* data, size_t length) {
    uint32_t crc = 0xFFFFFFFF;

    for (size_t i = 0; i < length; i++) {
        crc = (crc >> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xFF];
    }

    return ~crc; // 按位取反并转为无符号32位整数
}
//========================================//

//================ 工具函数 ================//
/**
 * 生成随机32位整数
 * @return - 随机32位整数
 */
uint32_t Utils::generateRandomU32() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<uint32_t> dist(0, 0xFFFFFFFF);
    return dist(gen);
}


/**
 * 记录日志
 * @param message - 日志消息
 * @param level - 日志级别
 */
void Utils::log(const std::string& message, LogLevel level) {
    // 根据日志级别选择输出流
    std::ostream& out = (level == LogLevel::ERROR) ? std::cerr : std::cout;

    // 日志级别前缀
    std::string prefix;
    switch (level) {
        case LogLevel::INFO:
            prefix = "[INFO] ";
        break;
        case LogLevel::SUCCESS:
            prefix = "[SUCCESS] ";
        break;
        case LogLevel::ERROR:
            prefix = "[ERROR] ";
        break;
        default:
            break;
    }

    // 输出日志
    out << prefix << message << std::endl;
}

std::string Utils::bytesToHex(const std::vector<uint8_t> &vector) {
    std::string hexStr;
    hexStr.reserve(vector.size() * 2); // Reserve space for hex characters

    for (const auto &byte: vector) {
        const auto hexDigits = "0123456789ABCDEF";
        hexStr += hexDigits[(byte >> 4) & 0xF]; // High nibble
        hexStr += hexDigits[byte & 0xF]; // Low nibble
    }
    return hexStr; // Return the formatted hex string
}

