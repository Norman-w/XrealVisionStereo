/*
XReal眼镜控制器类
包含眼镜的IO部分,命令构建部分,2D/3D模式切换等
由于总体面向最终的模式切换功能估未分层未分块
*/

#ifndef XREALGLASSESCONTROLLER_H
#define XREALGLASSESCONTROLLER_H

#include <cstdint>
#include <array>
#include <string>
#include <vector>
#include <random>
#include <memory>
#include <stdexcept>
#include <hidapi/hidapi.h>

// 前向声明一个设备句柄类
class DeviceHandle;

// 日志级别枚举
enum class LogLevel {
    INFO,
    SUCCESS,
    ERROR
};

class XRealGlassesController {
    // CRC32部分
private:
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
    void log(const std::string &message, LogLevel level = LogLevel::INFO) const;


    //设备连接部分
private:
    // 设备句柄
    std::unique_ptr<DeviceHandle> device;
    bool deviceOpened = false;


    //命令构建部分
private:
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
    static std::vector<uint8_t> buildCustomDisplayCommand(
        uint16_t msgId = 0x0008,
        uint8_t mode = 3,
        uint8_t subMode = 1,
        uint8_t param1 = 3,
        uint8_t param2 = 0xB4,
        uint8_t refresh = 0,
        uint16_t length = 0x18
    );

    /**
     * 将字符串转换为字节数组
     * @param str - 输入字符串
     * @return - 转换后的字节数组
     */
    static std::vector<uint8_t> strToPayload(const std::string &str);


    //设备通讯部分(命令的发送)
private:
    /**
     * 发送命令到眼镜设备
     * @param command - 命令（字符串或字节数组）
     * @return - 发送是否成功
     */
    bool sendCommand(const std::vector<uint8_t> &command);

    bool sendCommand(const std::string &command);


    //公共外放能力部分(连接/断开设备, 切换模式)
public:
    XRealGlassesController();

    ~XRealGlassesController();

    /**
     * 连接XReal眼镜
     * @param devicePath - 设备路径/标识符
     * @return - 连接是否成功
     */
    bool connectGlasses(const std::string &devicePath);

    /**
     * 断开XReal眼镜连接
     * @return - 断开是否成功
     */
    bool disconnectGlasses();

    /**
     * 检查设备是否已连接
     * @return - 设备是否已连接
     */
    bool isConnected() const;

    /**
     * 切换眼镜显示模式
     * @param mode3D - true为3D模式，false为2D模式
     * @return - 切换是否成功
     */
    bool switchMode(bool mode3D);
};

#endif //XREALGLASSESCONTROLLER_H
