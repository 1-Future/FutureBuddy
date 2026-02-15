// Copyright 2025 #1 Future — Apache 2.0 License
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    futurebuddy_desktop_lib::run();
}
