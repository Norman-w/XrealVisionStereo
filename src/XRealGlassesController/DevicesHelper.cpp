//
// Created by Norman Wang on 2025/5/2.
//

#include "DevicesHelper.h"
#include <hidapi/hidapi.h>
#include <locale>
#include <codecvt>

#include "CommandHelper.h"
#include "Utils.h"

// 辅助函数: 将wchar_t*转换为std::string
std::string wcharToString(const wchar_t* wstr) {
    if (!wstr) return "";
    
    try {
        // 使用C++标准库进行转换
        std::wstring_convert<std::codecvt_utf8<wchar_t>> converter;
        return converter.to_bytes(wstr);
    } catch (const std::exception& e) {
        Utils::log(std::string("字符转换异常: ") + e.what(), LogLevel::ERROR);
        return "";
    }
}

std::vector<GLASSES_INFO> DevicesHelper::enumerateHidDevices(bool filterByVidPid) {
    // Initialize the HIDAPI library
    if (hid_init() != 0) {
        Utils::log("无法初始化HID库", LogLevel::ERROR);
        return {};
    }

    std::vector<GLASSES_INFO> glassesList;

    try {
        // Enumerate HID devices
        struct hid_device_info *deviceList = hid_enumerate(0, 0); // Enumerate all devices
        struct hid_device_info *currentDevice = deviceList;

        while (currentDevice) {
            // If filtering by VID/PID, skip devices that don't match
            if (filterByVidPid) {
                if (currentDevice->vendor_id != DevicesHelper::XREAL_VID || currentDevice->product_id !=
                    DevicesHelper::XREAL_PID) {
                    currentDevice = currentDevice->next;
                    continue;
                }
            }

            GLASSES_INFO deviceInfo;
            deviceInfo.hid_path = currentDevice->path ? currentDevice->path : "";
            deviceInfo.vendorId = currentDevice->vendor_id;
            deviceInfo.productId = currentDevice->product_id;
            deviceInfo.serialNumber = wcharToString(currentDevice->serial_number);
            deviceInfo.manufacturer = wcharToString(currentDevice->manufacturer_string);
            deviceInfo.product = wcharToString(currentDevice->product_string);

            Utils::log(
                "找到HID设备: " + deviceInfo.product + " (VID: " + std::to_string(deviceInfo.vendorId) + ", PID: " +
                std::to_string(deviceInfo.productId) + ")", LogLevel::INFO);

            // Add interfaces to the device info
            deviceInfo.interfaces = DevicesHelper::enumerateDeviceInterfaces(
                currentDevice->vendor_id, currentDevice->product_id);

            glassesList.push_back(deviceInfo);

            // Move to the next device in the list
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

std::vector<INTERFACE_INFO> DevicesHelper::enumerateDeviceInterfaces(uint16_t vendorId, uint16_t productId) {
    std::vector<INTERFACE_INFO> interfaces;
    // Initialize the HIDAPI library
    if (hid_init() != 0) {
        Utils::log("无法初始化HID库", LogLevel::ERROR);
        return interfaces;
    }

    // Enumerate all HID devices
    struct hid_device_info *deviceList = hid_enumerate(vendorId, productId);
    struct hid_device_info *currentDevice = deviceList;

    while (currentDevice) {
        // Open HID device
        hid_device *hidDevice = hid_open(currentDevice->vendor_id, currentDevice->product_id, nullptr);
        if (hidDevice) {
            INTERFACE_INFO interfaceInfo;
            interfaceInfo.interface_number = currentDevice->interface_number;
            interfaceInfo.is_connected = true;
            interfaceInfo.original_hid_device = hidDevice;
            interfaces.push_back(interfaceInfo);

            Utils::log("发现子设备: Interface = " + std::to_string(interfaceInfo.interface_number), LogLevel::INFO);
        } else {
            Utils::log("无法打开设备，Interface = " + std::to_string(currentDevice->interface_number), LogLevel::WARNING);
        }

        // Move to the next device in the list
        currentDevice = currentDevice->next;
    }

    // Free the device list allocated by HIDAPI
    hid_free_enumeration(deviceList);

    // Finalize HIDAPI
    hid_exit();

    return interfaces;
}

/**
 * 发送命令到眼镜设备（字节数组版本）
 * @param command - 命令数据
 * @return - 发送是否成功
 */
bool DevicesHelper::sendCommand(const INTERFACE_INFO *interface, const std::vector<uint8_t> &command) {
    // 检查设备是否连接
    if (!interface || !interface->is_connected) {
        Utils::log("设备未打开，无法发送命令", LogLevel::ERROR);
        return false;
    }
    Utils::log("设备状态正常", LogLevel::SUCCESS);
    try {
        // 添加0xFD前缀
        std::vector<uint8_t> data(command.size() + 1);
        data[0] = 0xFD; // 添加前缀
        std::copy(command.begin(), command.end(), data.begin() + 1); // 复制命令数据

        // 尝试两种方式发送命令
        try {
            // 方式1: 使用sendReport
            if (const int result = hid_write(interface->original_hid_device, data.data(), data.size())) {
                Utils::log("命令已使用sendReport发送", LogLevel::SUCCESS);
                // 输出result
                Utils::log("sendReport返回值: " + std::to_string(result), LogLevel::INFO);
                return true;
            }
            Utils::log("sendReport失败", LogLevel::ERROR);
        } catch (const std::exception &error) {
            Utils::log(std::string("sendReport异常: ") + error.what(), LogLevel::ERROR);

            // 方式2: 尝试使用sendFeatureReport
            try {
                if (const bool result = hid_send_feature_report(interface->original_hid_device, data.data(), data.size())) {
                    Utils::log("命令已使用sendFeatureReport发送", LogLevel::SUCCESS);
                    // 输出result
                    Utils::log("sendFeatureReport返回值: " + std::to_string(result), LogLevel::INFO);
                    return true;
                }
                Utils::log("sendFeatureReport失败", LogLevel::ERROR);
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

    // 将字符串转换为字节数组并发送
    return sendCommand(interface, CommandHelper::strToPayload(command));
}
