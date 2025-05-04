#ifndef INTERFACE_INFO_H
#define INTERFACE_INFO_H
#include <string>
#include <vector>
#include <hidapi/hidapi.h>
#include <atomic>

class INTERFACE_INFO {
private:
    // 添加共享引用计数，确保多个对象安全共享设备句柄
    struct DeviceResource {
        hid_device* device;
        std::atomic<int> refCount;

        explicit DeviceResource(hid_device* dev) : device(dev), refCount(1) {}
        ~DeviceResource() {
            if (device) {
                hid_close(device);
                device = nullptr;
            }
        }
    };
    
    // 共享的设备资源
    std::shared_ptr<DeviceResource> deviceResource;
    
public:
    int interface_number;
    bool is_connected;
    //定义一个用于保存path的,防止到时候连错了设备
    std::string hid_path;
    
    // 访问原始设备指针的属性（只读）
    [[nodiscard]] hid_device* original_hid_device() const {
        return deviceResource ? deviceResource->device : nullptr;
    }
    
    //最近收到的消息列表的原始数据(字节流)
    std::vector<std::vector<uint8_t>> received_messages;
    
    // 构造函数
    INTERFACE_INFO();
    
    // 拷贝构造函数 - 特别注意处理hid_device指针
    INTERFACE_INFO(const INTERFACE_INFO& other);
    
    // 赋值运算符
    INTERFACE_INFO& operator=(const INTERFACE_INFO& other);
    
    // 析构函数
    ~INTERFACE_INFO();
    
    bool open();
    bool close();
    void startMessagePolling();
    void stopMessagePolling();
    
    // 设置原始设备指针的方法
    void setOriginalHidDevice(hid_device* device);
};
#endif //INTERFACE_INFO_H
