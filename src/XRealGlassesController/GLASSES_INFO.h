//
// Created by Norman Wang on 2025/5/2.
//

#ifndef DEVICE_INFO_H
#define DEVICE_INFO_H
#include <cstdint>
#include <string>
#include <hidapi/hidapi.h>

#include "INTERFACE_INFO.h"


// struct GlassesInfo {
//     std::string hid_path;
//     uint16_t vendorId;
//     uint16_t productId;
//     std::string serialNumber;
//     std::string manufacturer;
//     std::string product;
//     int interface_number;
//     bool is_connected;
//     hid_device* original_hid_device;
// };
class GLASSES_INFO {
public:
    std::string hid_path;
    uint16_t vendorId;
    uint16_t productId;
    std::string serialNumber;
    std::string manufacturer;
    std::string product;
    std::vector<INTERFACE_INFO> interfaces;
};


#endif //DEVICE_INFO_H
