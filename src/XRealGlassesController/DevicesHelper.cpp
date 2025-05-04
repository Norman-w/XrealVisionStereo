//
// Created by Norman Wang on 2025/5/2.
//

#include "DevicesHelper.h"
#include <hidapi/hidapi.h>
#include <locale>
#include <codecvt>
#include <thread>

#include "CommandHelper.h"
#include "Utils.h"

// 辅助函数: 将wchar_t*转换为std::string
std::string wcharToString(const wchar_t *wstr) {
    if (!wstr) return "";

    try {
        // 使用C++标准库进行转换
        std::wstring_convert<std::codecvt_utf8<wchar_t> > converter;
        return converter.to_bytes(wstr);
    } catch (const std::exception &e) {
        Utils::log(std::string("字符转换异常: ") + e.what(), LogLevel::ERROR);
        return "";
    }
}

std::vector<GLASSES_INFO> DevicesHelper::enumerateClassesByHid() {
    // Initialize the HIDAPI library
    if (hid_init() != 0) {
        Utils::log("无法初始化HID库", LogLevel::ERROR);
        return {};
    }

    std::vector<GLASSES_INFO> glassesList;

    try {
        //根据VID查询所有XREAL设备的所有接口
        struct hid_device_info *deviceList = hid_enumerate(XREAL_VID, 0);
        if (!deviceList) {
            Utils::log("未找到任何XREAL设备", LogLevel::WARNING);
            hid_exit();  // 确保退出HID库
            return {};
        }
        
        //指针游标
        const struct hid_device_info *currentDevice = deviceList;

        while (currentDevice) {
            //如果glassesList已经有了这个序列号的设备,则向其接口列表中添加当前"device"作为接口
            auto sn = currentDevice->serial_number ? wcharToString(currentDevice->serial_number) : "";
            if (sn.empty()) {
                Utils::log("设备没有序列号，跳过", LogLevel::WARNING);
                currentDevice = currentDevice->next;
                continue;
            }
            
            //之前已经找到过这个序列号的设备
            auto thisDevice = std::find_if(glassesList.begin(), glassesList.end(),
                                           [&sn](const GLASSES_INFO &device) { return device.serialNumber == sn; });
            //如果找到过这个序列号的设备
            if (thisDevice != glassesList.end()) {
                // 找到匹配的设备，添加接口
                INTERFACE_INFO interfaceInfo{};
                interfaceInfo.interface_number = currentDevice->interface_number;
                interfaceInfo.hid_path = currentDevice->path ? currentDevice->path : "";
                thisDevice->interfaces.push_back(interfaceInfo);
                Utils::log("找到子设备: Interface = " + std::to_string(interfaceInfo.interface_number), LogLevel::INFO);
            } else {
                // 没有找到匹配的设备，创建新的GLASSES_INFO对象
                GLASSES_INFO newGlassesInfo;
                newGlassesInfo.vendorId = currentDevice->vendor_id;
                newGlassesInfo.productId = currentDevice->product_id;
                newGlassesInfo.serialNumber = sn;
                newGlassesInfo.manufacturer = currentDevice->manufacturer_string ? 
                                             wcharToString(currentDevice->manufacturer_string) : "";
                newGlassesInfo.product = currentDevice->product_string ? 
                                         wcharToString(currentDevice->product_string) : "";
                newGlassesInfo.interfaces.clear();
                auto interfaceInfo = INTERFACE_INFO{};
                interfaceInfo.interface_number = currentDevice->interface_number;
                interfaceInfo.hid_path = currentDevice->path ? currentDevice->path : "";
                newGlassesInfo.interfaces.push_back(interfaceInfo);

                Utils::log(
                    "找到HID设备: " + newGlassesInfo.product + " (VID: " + std::to_string(newGlassesInfo.vendorId) +
                    ", PID: " +
                    std::to_string(newGlassesInfo.productId) + ")", LogLevel::INFO);

                glassesList.push_back(newGlassesInfo);
            }
            currentDevice = currentDevice->next;
        }

        // Free the device list allocated by HIDAPI
        hid_free_enumeration(deviceList);
    } catch (const std::exception &e) {
        Utils::log(std::string("遍历设备时发生异常: ") + e.what(), LogLevel::ERROR);
    }

    // Finalize the HIDAPI library
    if (hid_exit() != 0) {
        Utils::log("无法关闭HID库", LogLevel::WARNING);
    }
    return glassesList;
}

INTERFACE_INFO DevicesHelper::getValidHidInterface(const std::vector<INTERFACE_INFO> &interfaces) {
    // 检查接口列表是否为空
    if (interfaces.empty()) {
        Utils::log("接口列表为空，无法查找有效接口", LogLevel::ERROR);
        return INTERFACE_INFO{};
    }

    //向每一个接口发送一条v消息
    for (auto &interface: interfaces) {
        const auto nonConstInterface = const_cast<INTERFACE_INFO *>(&interface);
        //打开设备
        if (!nonConstInterface->open()) {
            Utils::log("无法打开接口 " + std::to_string(interface.interface_number), LogLevel::WARNING);
            continue;
        }
        //使用异步方式发送命令
        sendCommandAsync(nonConstInterface, "v", [](bool result) {
            if (result) {
                Utils::log("命令发送成功", LogLevel::SUCCESS);
            } else {
                Utils::log("命令发送失败", LogLevel::ERROR);
            }
        });
    }
    // 等待1秒钟
    std::this_thread::sleep_for(std::chrono::seconds(1));
    
    // 用于保存找到的有效接口
    INTERFACE_INFO validInterface;
    bool found = false;
    
    //检查所有接口上收到的消息列表,如果最后一条是0xFD开头的消息,则这个接口就是有效的用于通讯的接口
    for (const auto &interface: interfaces) {
        // 检查最后一条消息是否以0xFD开头
        if (!interface.received_messages.empty() && !interface.received_messages.back().empty() &&
            interface.received_messages.back()[0] == 0xFD) {
            Utils::log("找到有效的通讯接口: " + std::to_string(interface.interface_number), LogLevel::SUCCESS);
            validInterface = interface;
            found = true;
            break;
        }
    }
    
    // 关闭无效的接口，保持有效接口打开
    for (auto &interface: interfaces) {
        // 如果不是找到的有效接口，则关闭它
        if (found && interface.interface_number != validInterface.interface_number) {
            const auto nonConstInterface = const_cast<INTERFACE_INFO *>(&interface);
            nonConstInterface->close();
        }
        // 如果没找到有效接口，或者遍历到的就是有效接口，则不关闭
    }
    
    if (!found) {
        Utils::log("没有找到有效的通讯接口", LogLevel::ERROR);
        
        // 如果没找到有效接口，关闭所有接口
        for (auto &interface: interfaces) {
            const auto nonConstInterface = const_cast<INTERFACE_INFO *>(&interface);
            nonConstInterface->close();
        }
        
        return INTERFACE_INFO{};
    }
    
    return validInterface;
}

/**
 * 发送命令到眼镜设备（字节数组版本）
 * @param interface
 * @param command - 命令数据
 * @return - 发送是否成功
 */
bool DevicesHelper::sendCommand(const INTERFACE_INFO *interface, const std::vector<uint8_t> &command) {
    // 检查设备是否连接
    if (!interface || !interface->is_connected || !interface->original_hid_device()) {
        Utils::log("设备未打开或无效，无法发送命令", LogLevel::ERROR);
        return false;
    }
    Utils::log("设备状态正常", LogLevel::SUCCESS);
    try {
        // 不再添加0xFD前缀，直接使用command
        // 因为buildCustomDisplayCommand已经设置了buffer[0] = 0xFD
        const std::vector<uint8_t>& data = command;
        
        // 检查数据有效性
        if (data.empty()) {
            Utils::log("命令数据为空", LogLevel::ERROR);
            return false;
        }
        
        // 打印数据内容以便调试
        std::string hexData = "发送数据: ";
        for (size_t i = 0; i < std::min(data.size(), static_cast<size_t>(32)); i++) {
            char hexBuf[8];
            snprintf(hexBuf, sizeof(hexBuf), "%02X ", data[i]);
            hexData += hexBuf;
        }
        Utils::log(hexData, LogLevel::INFO);

        // 获取设备句柄
        hid_device* deviceHandle = interface->original_hid_device();
        
        // 尝试两种方式发送命令
        try {
            // 方式1: 使用sendReport
            const int result = hid_write(deviceHandle, data.data(), data.size());
            if (result > 0) {  // 只有返回值大于0时才表示成功
                Utils::log("命令已使用sendReport发送", LogLevel::SUCCESS);
                // 输出result
                Utils::log("sendReport返回值: " + std::to_string(result), LogLevel::INFO);
                return true;
            }
            
            // 打印错误信息
            const wchar_t* err = hid_error(deviceHandle);
            Utils::log("sendReport失败: " + (err ? wcharToString(err) : "未知错误") + " 返回值: " + std::to_string(result), LogLevel::ERROR);
            
        } catch (const std::exception &error) {
            Utils::log(std::string("sendReport异常: ") + error.what(), LogLevel::ERROR);

            // 方式2: 尝试使用sendFeatureReport
            try {
                const int result = hid_send_feature_report(deviceHandle, data.data(), data.size());
                if (result > 0) {  // 只有返回值大于0时才表示成功
                    Utils::log("命令已使用sendFeatureReport发送", LogLevel::SUCCESS);
                    // 输出result
                    Utils::log("sendFeatureReport返回值: " + std::to_string(result), LogLevel::INFO);
                    return true;
                }
                const wchar_t* err = hid_error(deviceHandle);
                Utils::log("sendFeatureReport失败: " + (err ? wcharToString(err) : "未知错误") + " 返回值: " + std::to_string(result), LogLevel::ERROR);
            } catch (const std::exception &featureError) {
                Utils::log(std::string("sendFeatureReport也异常: ") + featureError.what(), LogLevel::ERROR);
            }
        }

        Utils::log("所有发送方法都失败", LogLevel::ERROR);
        return false;
    } catch (const std::exception &error) {
        Utils::log(std::string("发送命令错误: ") + error.what(), LogLevel::ERROR);
        return false;
    }
}


/**
 * 发送命令到眼镜设备（字符串版本）
 * @param interface
 * @param command - 命令字符串
 * @return - 发送是否成功
 */
bool DevicesHelper::sendCommand(const INTERFACE_INFO *interface, const std::string &command) {
    // 记录命令文本
    Utils::log(std::string("命令文本: ") + command, LogLevel::INFO);
    auto payload = CommandHelper::strToPayload(command);
    //第一个字节0xfd + 命令的全部字节
    payload.insert(payload.begin(), 0xFD);
    // 将字符串转换为字节数组并发送
    return sendCommand(interface, payload);
}


/**
 * 异步发送命令到眼镜设备
 * @param interface - 设备接口
 * @param command - 命令数据
 * @param callback - 命令发送完成后的回调函数，参数为是否发送成功
 */
void DevicesHelper::sendCommandAsync(const INTERFACE_INFO *interface, const std::vector<uint8_t> &command,
                                     std::function<void(bool)> callback) {
    // 先检查接口是否有效
    if (!interface || !interface->is_connected || !interface->original_hid_device()) {
        Utils::log("设备未打开或无效，无法异步发送命令", LogLevel::ERROR);
        if (callback) {
            callback(false);
        }
        return;
    }

    // 使用单独的线程异步发送命令
    std::thread([interface, command, callback]() {
        try {
            bool result = sendCommand(interface, command);
            // 调用回调函数传递结果
            if (callback) {
                callback(result);
            }
        } catch (const std::exception &error) {
            Utils::log(std::string("异步发送命令错误: ") + error.what(), LogLevel::ERROR);
            if (callback) {
                callback(false);
            }
        }
    }).detach(); // 使用detach分离线程
}

/**
 * 异步发送命令到眼镜设备（字符串版本）
 * @param interface - 设备接口
 * @param command - 命令字符串
 * @param callback - 命令发送完成后的回调函数，参数为是否发送成功
 */
void DevicesHelper::sendCommandAsync(const INTERFACE_INFO *interface, const std::string &command,
                                     const std::function<void(bool)> &callback) {
    // 先检查接口是否有效
    if (!interface || !interface->is_connected || !interface->original_hid_device()) {
        Utils::log("设备未打开或无效，无法异步发送命令: " + command, LogLevel::ERROR);
        if (callback) {
            callback(false);
        }
        return;
    }
    
    auto payload = CommandHelper::strToPayload(command);
    //第一个字节0xfd + 命令的全部字节
    payload.insert(payload.begin(), 0xFD);
    // 将字符串转换为字节数组并发送
    sendCommandAsync(interface, payload, callback);
}


