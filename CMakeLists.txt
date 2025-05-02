cmake_minimum_required(VERSION 3.10)
project(XrealVisionStereo CXX OBJCXX) # OBJCXX 用于 .mm 文件

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# macOS 特定设置
if (APPLE)
    set(CMAKE_OSX_DEPLOYMENT_TARGET "10.13" CACHE STRING "最低 macOS 部署目标")
    set(CMAKE_MACOSX_BUNDLE TRUE) # 创建 .app bundle
    set(CMAKE_MACOSX_RPATH TRUE)
endif ()

# 查找 wxWidgets
# 需要先安装 wxWidgets (例如通过 Homebrew: brew install wxwidgets)
# 可能需要设置 wxWidgets_ROOT_DIR 环境变量或 CMake 变量
find_package(wxWidgets REQUIRED COMPONENTS core base webview)
include(${wxWidgets_USE_FILE})

# 查找必要的 macOS 框架
find_library(CORE_GRAPHICS_FRAMEWORK CoreGraphics)
find_library(APPKIT_FRAMEWORK AppKit) # 某些 CG 函数需要 AppKit
find_library(IOKIT_FRAMEWORK IOKit) # HIDAPI 需要

# 查找 HIDAPI
find_library(HIDAPI_LIBRARY hidapi)
find_path(HIDAPI_INCLUDE_DIR hidapi/hidapi.h)

if(NOT HIDAPI_LIBRARY OR NOT HIDAPI_INCLUDE_DIR)
    message(FATAL_ERROR "找不到 HIDAPI 库。请使用以下命令安装：brew install hidapi")
endif()

# --- 添加编译定义以禁用调试模式下的 wx 断言 ---
add_compile_definitions(wxDEBUG_LEVEL=0)
# --- 编译定义结束 ---

# 添加源文件
add_executable(${PROJECT_NAME}
        src/main.cpp
        src/App.h src/App.cpp
        src/MainFrame.h src/MainFrame.cpp
        src/ScreenResolution.h src/ScreenResolution.mm
        src/XRealGlassesController.h src/XRealGlassesController.cpp
)

# 链接库
target_link_libraries(${PROJECT_NAME}
        ${wxWidgets_LIBRARIES}
        ${CORE_GRAPHICS_FRAMEWORK}
        ${APPKIT_FRAMEWORK}
        ${IOKIT_FRAMEWORK}
        ${HIDAPI_LIBRARY}
)

# 显式添加包含目录
target_include_directories(${PROJECT_NAME} PUBLIC
        ${wxWidgets_INCLUDE_DIRS}
        ${HIDAPI_INCLUDE_DIR}
)

# 设置 bundle 属性
set_target_properties(${PROJECT_NAME} PROPERTIES
        MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_SOURCE_DIR}/Info.plist"
        # MACOSX_BUNDLE_ICON_FILE "YourIcon.icns" # 可选
)

# 将 HTML 文件复制到应用程序 bundle 资源目录
add_custom_command(
        TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
        ${CMAKE_CURRENT_SOURCE_DIR}/html $<TARGET_FILE_DIR:${PROJECT_NAME}>/../Resources/html
        COMMENT "正在将 HTML 资源复制到 bundle"
)

# 为 Objective-C++ 文件也设置 C++ 标准
set_source_files_properties(src/ScreenResolution.mm PROPERTIES CXX_STANDARD 17)