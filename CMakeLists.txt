cmake_minimum_required(VERSION 3.10)
project(XrealVisionStereo CXX OBJCXX) # OBJCXX 用于 .mm 文件

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# macOS specific settings
if(APPLE)
    set(CMAKE_OSX_DEPLOYMENT_TARGET "10.13" CACHE STRING "Minimum macOS deployment target")
    set(CMAKE_MACOSX_BUNDLE TRUE) # 创建 .app bundle
    set(CMAKE_MACOSX_RPATH TRUE)
endif()

# Find wxWidgets
# 需要先安装 wxWidgets (例如通过 Homebrew: brew install wxwidgets)
# 可能需要设置 wxWidgets_ROOT_DIR 环境变量或 CMake 变量
find_package(wxWidgets REQUIRED COMPONENTS core base webview)
include(${wxWidgets_USE_FILE})

# Find necessary macOS Frameworks
find_library(CORE_GRAPHICS_FRAMEWORK CoreGraphics)
find_library(APPKIT_FRAMEWORK AppKit) # AppKit is needed for some CG functions

# Add source files
add_executable(${PROJECT_NAME}
    src/main.cpp
    src/App.h src/App.cpp
    src/MainFrame.h src/MainFrame.cpp
    src/ScreenResolution.h src/ScreenResolution.mm
)

# Link libraries
target_link_libraries(${PROJECT_NAME}
    ${wxWidgets_LIBRARIES}
    ${CORE_GRAPHICS_FRAMEWORK}
    ${APPKIT_FRAMEWORK}
)

# Set bundle properties
set_target_properties(${PROJECT_NAME} PROPERTIES
    MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_SOURCE_DIR}/Info.plist"
    # MACOSX_BUNDLE_ICON_FILE "YourIcon.icns" # Optional
)

# Copy HTML file to the application bundle resources
add_custom_command(
    TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            ${CMAKE_CURRENT_SOURCE_DIR}/html $<TARGET_FILE_DIR:${PROJECT_NAME}>/../Resources/html
    COMMENT "Copying HTML resources to bundle"
)

# Set C++ standard for Objective-C++ files too
set_source_files_properties(src/ScreenResolution.mm PROPERTIES CXX_STANDARD 17) 