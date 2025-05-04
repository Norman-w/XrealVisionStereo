//
// Created by Norman Wang on 2025/5/2.
//

#ifndef DEVICESHELPER_H
#define DEVICESHELPER_H
#include <map>
#include <vector>

#include "GLASSES_INFO.h"


class DevicesHelper {
    // 接收到的消息缓存
    std::map<std::string, std::vector<std::vector<uint8_t>>> receivedMessages;
public:

    // XREAL设备的VID/PID (这些值需要根据实际情况调整)
    static constexpr uint16_t XREAL_VID = 0x3318;  // 假设的VID
    // static constexpr uint16_t XREAL_PID = 0x0424;  // 假设的PID
    //================ 设备连接部分 ================//
    /**
     * 遍历所有计算机的HID设备
     * @return - 设备信息列表
     */
    static std::vector<GLASSES_INFO> enumerateClassesByHid();

    /**
     * 测试设备通讯
     * @param interfaces - 要测试的接口列表
     * @return - 有效接口路径列表
     */
    static INTERFACE_INFO getValidHidInterface(const std::vector<INTERFACE_INFO>& interfaces);
    /**
     * 发送命令到眼镜设备
     * @param interface 要使用哪个接口发送
     * @param command - 命令（字符串或字节数组）
     * @return - 发送是否成功
     */
    static bool sendCommand(const INTERFACE_INFO *interface, const std::vector<uint8_t>& command);

    static void sendCommandAsync(const INTERFACE_INFO *interface, const std::vector<uint8_t> &command,
                                 std::function<void(bool)> callback);

    static void sendCommandAsync(const INTERFACE_INFO *interface, const std::string &command,
                          const std::function<void(bool)> &callback);

    static bool sendCommand(const INTERFACE_INFO *interface, const std::string &command);
};



#endif //DEVICESHELPER_H
