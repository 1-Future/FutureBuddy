// Copyright 2025 #1 Future — Apache 2.0 License

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running FutureBuddy Desktop");
}
