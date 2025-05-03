#ifndef INTERFACE_INFO_H
#define INTERFACE_INFO_H
#include <string>
#include <vector>
#include <hidapi/hidapi.h>

class INTERFACE_INFO {
public:
    int interface_number;
    bool is_connected;
    //定义一个用于保存path的,防止到时候连错了设备
    std::string hid_path;
    hid_device *original_hid_device;
    //最近收到的消息列表的原始数据(字节流)
    std::vector<std::vector<uint8_t>> received_messages;
    bool open();
    bool close();
    void startMessagePolling();
    void stopMessagePolling();
};
#endif //INTERFACE_INFO_H
