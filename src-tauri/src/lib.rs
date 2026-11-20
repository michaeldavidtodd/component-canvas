use tauri::menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu};

fn build_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
  let pkg_info = app.package_info();
  let about_metadata = AboutMetadata {
    name: Some(pkg_info.name.clone()),
    version: Some(pkg_info.version.to_string()),
    ..Default::default()
  };

  let app_menu = Submenu::with_items(
    app,
    pkg_info.name.clone(),
    true,
    &[
      &PredefinedMenuItem::about(app, None, Some(about_metadata))?,
      &PredefinedMenuItem::separator(app)?,
      &PredefinedMenuItem::services(app, None)?,
      &PredefinedMenuItem::separator(app)?,
      &PredefinedMenuItem::hide(app, None)?,
      &PredefinedMenuItem::hide_others(app, None)?,
      &PredefinedMenuItem::separator(app)?,
      &PredefinedMenuItem::quit(app, None)?,
    ],
  )?;

  let file_menu = Submenu::with_items(
    app,
    "File",
    true,
    &[&PredefinedMenuItem::close_window(app, None)?],
  )?;

  // Undo/Redo are intentionally omitted so Cmd+Z reaches the webview, where the
  // canvas history handler lives.
  let edit_menu = Submenu::with_items(
    app,
    "Edit",
    true,
    &[
      &PredefinedMenuItem::cut(app, None)?,
      &PredefinedMenuItem::copy(app, None)?,
      &PredefinedMenuItem::paste(app, None)?,
      &PredefinedMenuItem::select_all(app, None)?,
    ],
  )?;

  let view_menu = Submenu::with_items(
    app,
    "View",
    true,
    &[&PredefinedMenuItem::fullscreen(app, None)?],
  )?;

  let window_menu = Submenu::with_items(
    app,
    "Window",
    true,
    &[
      &PredefinedMenuItem::minimize(app, None)?,
      &PredefinedMenuItem::maximize(app, None)?,
      &PredefinedMenuItem::separator(app)?,
      &PredefinedMenuItem::close_window(app, None)?,
    ],
  )?;

  Menu::with_items(
    app,
    &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu],
  )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .menu(|app| build_menu(app))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
