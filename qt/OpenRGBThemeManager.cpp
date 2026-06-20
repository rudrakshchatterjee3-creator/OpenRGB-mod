/*---------------------------------------------------------*\
| OpenRGBThemeManager.cpp                                   |
|                                                           |
|   Functionality for managing dark theme mode              |
|                                                           |
|   This file is part of the OpenRGB project                |
|   SPDX-License-Identifier: GPL-2.0-or-later               |
\*---------------------------------------------------------*/

#include <QApplication>
#include <QWidget>
#include <QStyle>
#include <QPalette>
#include <QStyleFactory>

#ifdef _WIN32
#include <QSettings>
#endif

#include "OpenRGBThemeManager.h"
#include "ResourceManager.h"
#include "PluginManager.h"
#include "SettingsManager.h"

void OpenRGBThemeManager::Init()
{

#ifdef __APPLE__
    /*-------------------------------------------------*\
    | Apply Qt Fusion theme on MacOS, as the MacOS      |
    | default theme does not handle vertical tabs well  |
    \*-------------------------------------------------*/
    QApplication::setStyle(QStyleFactory::create("Fusion"));
#endif
    /*-------------------------------------------------*\
    | Apply dark theme if configured                    |
    \*-------------------------------------------------*/
    if(IsDarkTheme())
    {
        SetDarkTheme();
    }
}

void OpenRGBThemeManager::SetDarkTheme()
{
    QPalette pal;

    pal.setColor(QPalette::WindowText,      Qt::white);
    pal.setColor(QPalette::Link,            QColor(0,127,220));
    pal.setColor(QPalette::LinkVisited,     QColor(64,196,220));
    pal.setColor(QPalette::Window,          QColor(53,53,53));
    pal.setColor(QPalette::Base,            QColor(53,53,53));
    pal.setColor(QPalette::AlternateBase,   QColor(66,66,66));
    pal.setColor(QPalette::ToolTipBase,     Qt::white);
    pal.setColor(QPalette::ToolTipText,     Qt::black);
    pal.setColor(QPalette::Text,            Qt::white);
    pal.setColor(QPalette::Dark,            QColor(35,35,35));
    pal.setColor(QPalette::Shadow,          QColor(20,20,20));
    pal.setColor(QPalette::Button,          QColor(53,53,53));
    pal.setColor(QPalette::ButtonText,      Qt::white);
    pal.setColor(QPalette::BrightText,      Qt::red);
    pal.setColor(QPalette::Highlight,       QColor(42,130,218));
    pal.setColor(QPalette::HighlightedText, Qt::white);

    pal.setColor(QPalette::Disabled, QPalette::Text,             QColor(127,127,127));
    pal.setColor(QPalette::Disabled, QPalette::WindowText,       QColor(127,127,127));
    pal.setColor(QPalette::Disabled, QPalette::Highlight,        QColor(80,80,80)   );
    pal.setColor(QPalette::Disabled, QPalette::ButtonText,       QColor(127,127,127));
    pal.setColor(QPalette::Disabled, QPalette::HighlightedText,  QColor(127,127,127));
    pal.setColor(QPalette::Disabled, QPalette::Text,             QColor(127,127,127));
    pal.setColor(QPalette::Disabled, QPalette::ButtonText,       QColor(127,127,127));

#ifdef _WIN32
    QApplication::setStyle(QStyleFactory::create("Fusion"));
#endif

    QApplication::setPalette(pal);

    /*-------------------------------------------------*\
    | Apply Premium Opaque Flat-Modern QSS Styling      |
    \*-------------------------------------------------*/
    QString modernQSS = 
        "QMainWindow, QDialog { background-color: #0D0D12; }"
        "QWidget { background-color: #0D0D12; color: #E0E0E5; font-family: 'Segoe UI', sans-serif; }"
        "QWidget#centralWidget { background-color: #0D0D12; }"
        "QPushButton { background-color: #1A1A24; border: 1px solid #2B2B36; border-radius: 8px; padding: 8px 16px; font-weight: bold; color: #FFFFFF; }"
        "QPushButton:hover { background-color: #2D2D3D; border-color: #3C3C4A; }"
        "QPushButton:pressed { background-color: #1A1A24; color: #A0A0B0; }"
        "QTabBar::tab { background-color: #121218; border: none; padding: 10px 20px; margin-right: 4px; border-radius: 6px; color: #A0A0B0; }"
        "QTabBar::tab:selected { background-color: #2D2D3D; color: #FFFFFF; font-weight: bold; border-bottom: 2px solid #5C5CFF; }"
        "QTabBar::tab:hover:!selected { background-color: #1A1A24; color: #D0D0D5; }"
        "QTabWidget::pane { border: 1px solid #2B2B36; background-color: #121218; border-radius: 8px; }"
        "QSlider::groove:horizontal { border: none; height: 6px; background: #1A1A24; border-radius: 3px; }"
        "QSlider::handle:horizontal { background: #5C5CFF; width: 16px; margin: -5px 0; border-radius: 8px; }"
        "QSlider::handle:horizontal:hover { background: #7A7AFF; }"
        "QComboBox { background-color: #1A1A24; border: 1px solid #2B2B36; border-radius: 6px; padding: 6px 12px; color: #FFFFFF; }"
        "QComboBox::drop-down { border: 0px; }"
        "QScrollArea { border: none; background-color: transparent; }"
        "QLineEdit, QSpinBox { background-color: #121218; border: 1px solid #2B2B36; border-radius: 6px; padding: 6px; color: #FFFFFF; }";
    
    qApp->setStyleSheet(modernQSS);
}

bool OpenRGBThemeManager::IsDarkTheme()
{

    /*-------------------------------------------------*\
    | Dark theme settings                               |
    \*-------------------------------------------------*/
    json            theme_settings;

    /*-------------------------------------------------*\
    | Get prefered theme from settings manager          |
    \*-------------------------------------------------*/
    theme_settings = ResourceManager::get()->GetSettingsManager()->GetSettings("Theme");

    /*-------------------------------------------------*\
    | Read the theme key and adjust accordingly         |
    \*-------------------------------------------------*/
    std::string current_theme = "Light";

    if(theme_settings.contains("theme"))
    {
        current_theme = theme_settings["theme"];
    }

    if(current_theme == "Dark")
    {
        return true;
    }
#ifdef _WIN32
    else if(current_theme == "Auto")
    {
        QSettings settings("HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", QSettings::NativeFormat);

        if(settings.value("AppsUseLightTheme") != 0)
        {
            return false;
        }
        else
        {
            return true;
        }
    }

    return false;
#endif

    return false;
}
