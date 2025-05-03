//
// Created by Norman Wang on 2025/5/3.
//

#ifndef INTERFACE_INFO_H
#define INTERFACE_INFO_H
#include "DevicesHelper.h"


class INTERFACE_INFO {
public:
    int interface_number;
    bool is_connected;
    hid_device *original_hid_device;
};



#endif //INTERFACE_INFO_H
