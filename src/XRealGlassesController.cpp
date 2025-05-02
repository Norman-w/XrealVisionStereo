//
// Created by Norman Wang on 2025/5/2.
//

#include "XRealGlassesController.h"
#include <iostream>
#include <iomanip>
#include <sstream>

// 假设的设备句柄类
class DeviceHandle {
public:
    virtual ~DeviceHandle() = default;
    virtual bool open(const std::string& path) = 0;
    virtual void close() = 0;
    virtual bool isOpened() const = 0;
    virtual bool sendReport(uint8_t reportId, const std::vector<uint8_t>& data) = 0;
    virtual bool sendFeatureReport(uint8_t reportId, const std::vector<uint8_t>& data) = 0;
};

//================ CRC32相关 ================//
// 初始化CRC32表
const std::array<uint32_t, 256> XRealGlassesController::CRC32_TABLE = []() {
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
uint32_t XRealGlassesController::calculateCRC32(const uint8_t* data, size_t length) {
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
uint32_t XRealGlassesController::generateRandomU32() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_int_distribution<uint32_t> dist(0, 0xFFFFFFFF);
    return dist(gen);
}

/**
 * 将字符串转换为字节数组
 * @param str - 输入字符串
 * @return - 转换后的字节数组
 */
std::vector<uint8_t> XRealGlassesController::strToPayload(const std::string& str) {
    std::vector<uint8_t> result(str.begin(), str.end());
    return result;
}

/**
 * 记录日志
 * @param message - 日志消息
 * @param level - 日志级别
 */
void XRealGlassesController::log(const std::string& message, LogLevel level) const {
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
    }
    
    // 输出日志
    out << prefix << message << std::endl;
}
//========================================//

//================ 命令构建 ================//
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
std::vector<uint8_t> XRealGlassesController::buildCustomDisplayCommand(
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
    uint32_t seqNum = generateRandomU32();
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
    uint32_t crc = calculateCRC32(&buffer[5], length);
    buffer[1] = crc & 0xFF;
    buffer[2] = (crc >> 8) & 0xFF;
    buffer[3] = (crc >> 16) & 0xFF;
    buffer[4] = (crc >> 24) & 0xFF;

    return buffer;
}
//========================================//

//================ 公共接口 ================//
XRealGlassesController::XRealGlassesController() {
    // 构造函数实现
    // TODO: 在这里初始化设备句柄
}

XRealGlassesController::~XRealGlassesController() {
    // 断开设备连接
    disconnectGlasses();
}

/**
 * 检查设备是否已连接
 * @return - 设备是否已连接
 */
bool XRealGlassesController::isConnected() const {
    return device && deviceOpened;
}

/**
 * 连接XReal眼镜
 * @param devicePath - 设备路径/标识符
 * @return - 连接是否成功
 */
bool XRealGlassesController::connectGlasses(const std::string& devicePath) {
    // TODO: 实现眼镜连接逻辑
    // 这里需要实际的设备连接代码
    
    if (isConnected()) {
        log("设备已经连接", LogLevel::INFO);
        return true;
    }
    
    // 假设的连接实现
    try {
        // TODO: 实例化并连接实际设备
        // device = std::make_unique<ActualDeviceHandle>();
        // deviceOpened = device->open(devicePath);
        
        if (deviceOpened) {
            log("设备连接成功", LogLevel::SUCCESS);
            return true;
        } else {
            log("设备连接失败", LogLevel::ERROR);
            return false;
        }
    } catch (const std::exception& e) {
        log(std::string("连接设备异常: ") + e.what(), LogLevel::ERROR);
        return false;
    }
}

/**
 * 断开XReal眼镜连接
 * @return - 断开是否成功
 */
bool XRealGlassesController::disconnectGlasses() {
    if (!isConnected()) {
        log("设备未连接", LogLevel::INFO);
        return true;
    }
    
    try {
        // 关闭设备
        device->close();
        deviceOpened = false;
        log("设备已断开连接", LogLevel::SUCCESS);
        return true;
    } catch (const std::exception& e) {
        log(std::string("断开设备异常: ") + e.what(), LogLevel::ERROR);
        return false;
    }
}

/**
 * 发送命令到眼镜设备（字节数组版本）
 * @param command - 命令数据
 * @return - 发送是否成功
 */
bool XRealGlassesController::sendCommand(const std::vector<uint8_t>& command) {
    // 检查设备是否连接
    if (!isConnected()) {
        log("设备未连接", LogLevel::ERROR);
        return false;
    }

    try {
        // 添加0xFD前缀
        std::vector<uint8_t> data(command.size() + 1);
        data[0] = 0xFD;  // 添加前缀
        std::copy(command.begin(), command.end(), data.begin() + 1);  // 复制命令数据

        // 尝试两种方式发送命令
        try {
            // 方式1: 使用sendReport
            bool result = device->sendReport(0, data);
            if (result) {
                log("命令已使用sendReport发送", LogLevel::SUCCESS);
                return true;
            } else {
                log("sendReport失败", LogLevel::ERROR);
            }
        } catch (const std::exception& error) {
            log(std::string("sendReport异常: ") + error.what(), LogLevel::ERROR);

            // 方式2: 尝试使用sendFeatureReport
            try {
                bool result = device->sendFeatureReport(0, data);
                if (result) {
                    log("命令已使用sendFeatureReport发送", LogLevel::SUCCESS);
                    return true;
                } else {
                    log("sendFeatureReport失败", LogLevel::ERROR);
                }
            } catch (const std::exception& featureError) {
                log(std::string("sendFeatureReport也异常: ") + featureError.what(), LogLevel::ERROR);
            }
        }
        
        log("所有发送方法都失败", LogLevel::ERROR);
        return false;
    } catch (const std::exception& error) {
        log(std::string("发送命令错误: ") + error.what(), LogLevel::ERROR);
        return false;
    }
}

/**
 * 发送命令到眼镜设备（字符串版本）
 * @param command - 命令字符串
 * @return - 发送是否成功
 */
bool XRealGlassesController::sendCommand(const std::string& command) {
    // 记录命令文本
    log(std::string("命令文本: ") + command, LogLevel::INFO);
    
    // 将字符串转换为字节数组并发送
    return sendCommand(strToPayload(command));
}

/**
 * 切换眼镜显示模式
 * @param mode3D - true为3D模式，false为2D模式
 * @return - 切换是否成功
 */
bool XRealGlassesController::switchMode(bool mode3D) {
    // 构建显示模式命令
    uint8_t mode = mode3D ? 3 : 1;  // 假设3是3D模式，1是2D模式
    auto command = buildCustomDisplayCommand(0x0008, mode);
    
    // 发送命令
    log(std::string("切换到") + (mode3D ? "3D" : "2D") + "模式", LogLevel::INFO);
    return sendCommand(command);
}
//========================================//
