/* Mango Keywords multilingual UI: English(default), Arabic, Russian, Chinese, Vietnamese. */
(() => {
  'use strict';
  const LANGS = { en:'English', ar:'العربية', ru:'Русский', zh:'中文', vi:'Tiếng Việt' };
  const rows = [
    ['Tổng quan nhanh toàn bộ workflow','Workflow overview','نظرة عامة على سير العمل','Обзор рабочего процесса','工作流程概览'],
    ['Bắt đầu nhanh','Quick start','بدء سريع','Быстрый старт','快速开始'],
    ['3 bước: nạp keywords + params → gen dorks → check live qua proxy.','3 steps: load keywords + parameters → generate dorks → check availability through proxies.','3 خطوات: حمّل الكلمات والمعلمات ← أنشئ الاستعلامات ← افحصها عبر الوكلاء.','3 шага: загрузите ключи и параметры → создайте дорки → проверьте через прокси.','3 步：加载关键词和参数 → 生成 Dork → 通过代理检查。'],
    ['File .txt, mỗi dòng 1 mục','Text file, one item per line','ملف نصي، عنصر واحد في كل سطر','Текстовый файл, один элемент в строке','文本文件，每行一项'],
    ['Mở Maker','Open Maker','فتح المنشئ','Открыть Maker','打开生成器'],
    ['Nạp proxy HTTP / SOCKS','Load HTTP / SOCKS proxies','تحميل وكلاء HTTP / SOCKS','Загрузить HTTP / SOCKS прокси','加载 HTTP / SOCKS 代理'],
    ['Auto-detect, test live, xoay vòng','Auto-detect, test, and rotate','كشف تلقائي واختبار وتدوير','Автоопределение, тест и ротация','自动检测、测试和轮换'],
    ['Mở Proxies','Open Proxies','فتح الوكلاء','Открыть прокси','打开代理'],
    ['Check & xuất working','Check and export working items','فحص وتصدير العناصر العاملة','Проверить и экспортировать рабочие','检查并导出可用项'],
    ['Đa luồng, retry, lưu .txt','Multithreaded, retry, save as .txt','متعدد المسارات، إعادة محاولة، حفظ نصي','Многопоточность, повтор, сохранение .txt','多线程、重试、保存为 .txt'],
    ['Mở Checker','Open Checker','فتح الفاحص','Открыть Checker','打开检查器'],
    ['Trạng thái dữ liệu','Data status','حالة البيانات','Состояние данных','数据状态'],
    ['Dorks đã gen','Generated dorks','الاستعلامات المنشأة','Созданные дорки','已生成 Dork'],
    ['Dorks working','Working dorks','الاستعلامات العاملة','Рабочие дорки','可用 Dork'],
    ['Chưa chạy tác vụ nào','No task has run yet','لم يتم تشغيل أي مهمة','Задачи ещё не запускались','尚未运行任务'],
    ['Quản lý proxy','Manage proxies','إدارة الوكلاء','Управление прокси','管理代理'],
    ['Đuôi trang mục tiêu (site url cụ thể) — tick nhiều đuôi để gen hàng loạt','Target page extensions — select multiple extensions for batch generation','امتدادات الصفحة المستهدفة — اختر عدة امتدادات للإنشاء الدفعي','Расширения целевых страниц — выберите несколько для пакетной генерации','目标页面扩展名——可多选以批量生成'],
    ['Chỉ DB','DB only','قواعد البيانات فقط','Только БД','仅数据库'],
    ['Preset dork ưu tiên hệ CSDL (1 click là set template + đuôi + sf)','Database-focused dork preset (one click sets template, extension and search function)','إعداد استعلام قاعدة البيانات بنقرة واحدة','Пресет дорков БД: шаблон, расширение и функция одним кликом','数据库 Dork 预设（一键设置模板、扩展名和搜索函数）'],
    ['DB Engine ưu tiên (gợi ý Scanner)','Preferred database engine (scanner hint)','محرك قاعدة البيانات المفضل','Предпочтительная СУБД (подсказка сканеру)','首选数据库引擎（扫描器提示）'],
    ['Tự gõ tay (dùng ô sf bên dưới)','Enter manually (use the field below)','إدخال يدوي (استخدم الحقل أدناه)','Ввести вручную (поле ниже)','手动输入（使用下方字段）'],
    ['Preset sẽ tự đổi template + tick đuôi + ghi sf phù hợp DB.','The preset updates the template, extensions, and search function for the database.','يحدّث الإعداد القالب والامتدادات ووظيفة البحث لقاعدة البيانات.','Пресет обновит шаблон, расширения и функцию поиска для БД.','预设会为数据库更新模板、扩展名和搜索函数。'],
    ['Xword (xw) — nối thêm','Extra word (xw)','كلمة إضافية (xw)','Дополнительное слово (xw)','附加词 (xw)'],
    ['Page type dự phòng (khi không tick đuôi nào)','Fallback page type (when no extension is selected)','نوع الصفحة الاحتياطي','Резервный тип страницы','备用页面类型'],
    ['Số lượng muốn gen (max = tổng combo)','Amount to generate (max = total combinations)','العدد المطلوب إنشاؤه','Количество для генерации','生成数量'],
    ['Loại trùng','Remove duplicates','إزالة التكرارات','Удалять дубликаты','去重'],
    ['Kết quả','Results','النتائج','Результаты','结果'],
    ['Gửi → Checker','Send → Checker','إرسال ← الفاحص','Отправить → Checker','发送 → 检查器'],
    ['Dùng dorks đã gen','Use generated dorks','استخدام الاستعلامات المنشأة','Использовать созданные дорки','使用已生成 Dork'],
    ['Chế độ proxy','Proxy mode','وضع الوكيل','Режим прокси','代理模式'],
    ['Auto-detect (khuyên dùng)','Auto-detect (recommended)','كشف تلقائي (موصى به)','Автоопределение (рекомендуется)','自动检测（推荐）'],
    ['Ép HTTP/HTTPS','Force HTTP/HTTPS','فرض HTTP/HTTPS','Только HTTP/HTTPS','强制 HTTP/HTTPS'],
    ['Ép SOCKS4','Force SOCKS4','فرض SOCKS4','Только SOCKS4','强制 SOCKS4'],
    ['Ép SOCKS5','Force SOCKS5','فرض SOCKS5','Только SOCKS5','强制 SOCKS5'],
    ['Không dùng proxy','No proxy','بدون وكيل','Без прокси','不使用代理'],
    ['Hỗ trợ:','Supported:','المدعوم:','Поддерживается:','支持：'],
    ['Chưa có proxy — sẽ chạy direct.','No proxies — direct connection will be used.','لا يوجد وكلاء — سيتم الاتصال مباشرة.','Нет прокси — будет прямое подключение.','没有代理——将使用直连。'],
    ['Mở Proxy Manager','Open Proxy Manager','فتح مدير الوكلاء','Открыть менеджер прокси','打开代理管理器'],
    ['Delay mỗi req (ms)','Delay per request (ms)','التأخير لكل طلب (مللي ثانية)','Задержка запроса (мс)','每次请求延迟（毫秒）'],
    ['Xoay proxy','Proxy rotation','تدوير الوكيل','Ротация прокси','代理轮换'],
    ['Sticky (giữ đến khi lỗi)','Sticky (keep until failure)','ثابت (حتى الفشل)','Липкий (до ошибки)','粘性（出错前保持）'],
    ['Retry 1 lần khi lỗi/timeout','Retry once on error/timeout','إعادة المحاولة مرة عند الخطأ/المهلة','Один повтор при ошибке/тайм-ауте','出错/超时时重试一次'],
    ['Chưa có kết quả — hãy import dorks và bấm Check.','No results — import dorks and click Check.','لا نتائج — استورد الاستعلامات واضغط فحص.','Нет результатов — импортируйте дорки и нажмите Check.','暂无结果——导入 Dork 并点击检查。'],
    ['Lọc chỉ giữ đuôi web cụ thể (vd: php,asp,aspx,jsp,do,cfm — để trống = giữ hết)','Keep only selected web extensions (leave empty to keep all)','الاحتفاظ بامتدادات الويب المحددة فقط','Оставить только выбранные веб-расширения','仅保留指定网页扩展名（留空表示全部）'],
    ['Lọc đuôi','Extension filter','مرشح الامتداد','Фильтр расширений','扩展名筛选'],
    ['Tham số trích xuất','Extracted parameters','المعلمات المستخرجة','Извлечённые параметры','提取的参数'],
    ['Mục tiêu','Targets','الأهداف','Цели','目标'],
    ["Basic ( ' \" )",'Basic probes (\' \")','فحوص أساسية','Базовые пробы','基础探测'],
    ['Full DB (tự chọn theo engine)','Full DB (based on selected engine)','فحص قاعدة بيانات كامل','Полная проверка БД','完整数据库探测'],
    ['Ưu tiên DB engine','Preferred DB engine','محرك قاعدة البيانات المفضل','Предпочтительная СУБД','首选数据库引擎'],
    ['Tất cả (tự nhận diện)','All (auto-detect)','الكل (كشف تلقائي)','Все (автоопределение)','全部（自动检测）'],
    ['Chỉ scan đuôi','Scan only extensions','فحص الامتدادات فقط','Сканировать только расширения','仅扫描扩展名'],
    ['Kết quả scan','Scan results','نتائج الفحص','Результаты сканирования','扫描结果'],
    ['Chưa scan.','Not scanned yet.','لم يتم الفحص بعد.','Сканирование ещё не выполнено.','尚未扫描。'],
    ['Nhập proxy đa định dạng','Import proxies in multiple formats','استيراد الوكلاء بتنسيقات متعددة','Импорт прокси разных форматов','导入多种格式代理'],
    ['Mặc định: Auto (http → thử)','Default: Auto (try HTTP first)','الافتراضي: تلقائي','По умолчанию: авто','默认：自动（先尝试 HTTP）'],
    ['Mặc định: http','Default: HTTP','الافتراضي: HTTP','По умолчанию: HTTP','默认：HTTP'],
    ['Mặc định: socks4','Default: SOCKS4','الافتراضي: SOCKS4','По умолчанию: SOCKS4','默认：SOCKS4'],
    ['Mặc định: socks5','Default: SOCKS5','الافتراضي: SOCKS5','По умолчанию: SOCKS5','默认：SOCKS5'],
    ['Thêm list','Add list','إضافة قائمة','Добавить список','添加列表'],
    ['Xóa hết','Clear all','مسح الكل','Очистить всё','全部清除'],
    ['Lọc trùng','Remove duplicates','إزالة التكرارات','Удалить дубликаты','去重'],
    ['Format hỗ trợ:','Supported formats:','التنسيقات المدعومة:','Поддерживаемые форматы:','支持的格式：'],
    ['Kiểm tra sống / chết','Test live / dead','اختبار العامل / المتوقف','Проверка живых / мёртвых','测试可用/失效'],
    ['Xuất live','Export live','تصدير العاملة','Экспорт живых','导出可用代理'],
    ['Danh sách','List','القائمة','Список','列表'],
    ['Chưa có proxy. Import file hoặc dán list.','No proxies. Import a file or paste a list.','لا يوجد وكلاء. استورد ملفاً أو الصق قائمة.','Нет прокси. Импортируйте файл или вставьте список.','没有代理。请导入文件或粘贴列表。'],
    ['Làm sạch list','Clean list','تنظيف القائمة','Очистить список','清理列表'],
    ['Xóa dòng trống','Remove blank lines','إزالة الأسطر الفارغة','Удалить пустые строки','删除空行'],
    ['AntiPublic nhanh','Quick AntiPublic','AntiPublic سريع','Быстрый AntiPublic','快速 AntiPublic'],
    ['Giữ domain','Keep domain','الاحتفاظ بالنطاق','Оставить домен','保留域名'],
    ['Giữ user','Keep username','الاحتفاظ باسم المستخدم','Оставить пользователя','保留用户名'],
    ['Chỉ dòng có :','Only lines containing :','الأسطر التي تحتوي : فقط','Только строки с :','仅保留含 : 的行'],
    ['Dùng chung ô input/output bên trái.','Uses the shared input/output fields on the left.','يستخدم حقول الإدخال والإخراج على اليسار.','Используются общие поля слева.','使用左侧共用输入/输出框。'],
    ['Xuất / nhập nhanh','Quick export / import','تصدير / استيراد سريع','Быстрый экспорт / импорт','快速导出/导入'],
    ['Xuất session (.json)','Export session (.json)','تصدير الجلسة (.json)','Экспорт сессии (.json)','导出会话 (.json)'],
    ['Phím tắt & mẹo','Shortcuts & tips','اختصارات ونصائح','Горячие клавиши и советы','快捷键与技巧'],
    ['trong ô dán proxy = thêm nhanh','in the proxy paste box = quick add','في مربع لصق الوكيل = إضافة سريعة','в поле прокси = быстро добавить','在代理粘贴框中 = 快速添加'],
    ['Proxy không scheme → dùng “Mặc định” đã chọn','A proxy without a scheme uses the selected default','الوكيل بلا مخطط يستخدم الإعداد الافتراضي','Прокси без схемы использует выбранное значение','无协议代理使用所选默认值'],
    ['Checker tự bỏ qua proxy dead nếu đã test','Checker skips tested dead proxies','يتخطى الفاحص الوكلاء المتوقفين','Checker пропускает проверенные мёртвые прокси','检查器会跳过已测试失效的代理'],
    ['Threads 10–20 là ngọt nhất, timeout 8s','10–20 threads is recommended; timeout 8s','يوصى بـ 10–20 مساراً؛ المهلة 8 ثوانٍ','Рекомендуется 10–20 потоков; тайм-аут 8 с','建议 10–20 个线程；超时 8 秒'],
    ['hợp với proxy private ít con','works well with a small private proxy pool','مناسب لمجموعة وكلاء خاصة صغيرة','подходит для небольшого пула приватных прокси','适合较小的私有代理池'],
    ['Logged in as Admin','Logged in as Admin','تم الدخول كمسؤول','Вход: Admin','已以管理员身份登录'],
    ['Local session • offline','Local session • offline','جلسة محلية • دون اتصال','Локальная сессия • офлайн','本地会话 • 离线'],
    ['Clear log','Clear log','مسح السجل','Очистить журнал','清空日志'],
    ['Check dorks →','Check dorks →','فحص الاستعلامات ←','Проверить дорки →','检查 Dork →'],
    ['Import Keywords & Params','Import keywords and parameters','استيراد الكلمات والمعلمات','Импорт ключей и параметров','导入关键词和参数'],
    ['Proxy health','Proxy health','حالة الوكلاء','Состояние прокси','代理健康状态'],
    ['Variables','Variables','المتغيرات','Переменные','变量'],
    ['Template dork','Dork template','قالب الاستعلام','Шаблон дорка','Dork 模板'],
    ['General (tất cả)','General (all)','عام (الكل)','Общий (все)','通用（全部）'],
    ['Search operator (sf) preset','Search operator preset (sf)','إعداد معامل البحث','Пресет оператора поиска','搜索运算符预设'],
    ['Search function (sf)','Search function (sf)','وظيفة البحث','Функция поиска','搜索函数'],
    ['Import proxy','Import proxies','استيراد الوكلاء','Импорт прокси','导入代理'],
    ['Live results','Live results','النتائج المباشرة','Результаты','实时结果'],
    ['URL input','URL input','إدخال URL','Ввод URL','URL 输入'],
    ['Import file','Import file','استيراد ملف','Импорт файла','导入文件'],
    ['Proxy / live','Proxies / live','الوكلاء / العاملة','Прокси / живые','代理 / 可用'],
    ['Reset all','Reset all','إعادة تعيين الكل','Сбросить всё','全部重置'],
    ['Language','Language','اللغة','Язык','语言'],
    ['dòng','lines','أسطر','строк','行'], ['đuôi','extensions','امتدادات','расширений','扩展名'],
    ['Đã lưu','Saved','تم الحفظ','Сохранено','已保存'], ['Đã copy','Copied','تم النسخ','Скопировано','已复制'],
    ['Copy thất bại','Copy failed','فشل النسخ','Ошибка копирования','复制失败'],
    ['Chưa có kết quả.','No results yet.','لا توجد نتائج.','Результатов нет.','暂无结果。'],
    ['Không khớp / chưa có proxy.','No matches / no proxies.','لا تطابق / لا وكلاء.','Нет совпадений / прокси.','无匹配项/无代理。'],
    ['Sẵn sàng','Ready','جاهز','Готово','就绪'], ['Đã gen','Generated','تم الإنشاء','Создано','已生成'],
    ['Xong:','Completed:','اكتمل:','Завершено:','完成：'], ['Xóa','Delete','حذف','Удалить','删除'],
    ['lỗi','errors','أخطاء','ошибок','错误'], ['trùng','duplicates','تكرارات','дубликатов','重复'],
    ['Chưa có proxy để test','No proxies to test','لا يوجد وكلاء للاختبار','Нет прокси для теста','没有代理可测试'],
    ['Hãy import dorks trước','Import dorks first','استورد الاستعلامات أولاً','Сначала импортируйте дорки','请先导入 Dork'],
    ['Hãy import keywords + parameters trước','Import keywords and parameters first','استورد الكلمات والمعلمات أولاً','Сначала импортируйте ключи и параметры','请先导入关键词和参数'],
    ['Gen hàng loạt dork từ keywords × params','Generate dorks in bulk from keywords × parameters','إنشاء استعلامات دفعية من الكلمات × المعلمات','Пакетная генерация дорков из ключей × параметров','从关键词 × 参数批量生成 Dork'],
    ['Check live qua proxy đa luồng','Multithreaded availability checks through proxies','فحص متعدد المسارات عبر الوكلاء','Многопоточная проверка через прокси','通过代理进行多线程可用性检查'],
    ['Tách tham số từ URL','Extract parameters from URLs','استخراج المعلمات من URL','Извлечение параметров из URL','从 URL 提取参数'],
    ['Probe nhẹ phát hiện lỗi SQL','Light probes for SQL error detection','فحوص خفيفة لاكتشاف أخطاء SQL','Лёгкие пробы для выявления SQL-ошибок','轻量探测 SQL 错误'],
    ['Import HTTP / SOCKS4 / SOCKS5 đa định dạng','Import HTTP / SOCKS4 / SOCKS5 in multiple formats','استيراد HTTP / SOCKS4 / SOCKS5 بتنسيقات متعددة','Импорт HTTP / SOCKS4 / SOCKS5 разных форматов','导入多种格式的 HTTP / SOCKS4 / SOCKS5'],
    ['Làm sạch list & công cụ phụ','Clean lists and use helper tools','تنظيف القوائم وأدوات مساعدة','Очистка списков и вспомогательные инструменты','清理列表和辅助工具'],
    ['Clipboard trống','Clipboard is empty','الحافظة فارغة','Буфер обмена пуст','剪贴板为空'],
    ['Không đọc được clipboard — cấp quyền clipboard','Cannot read the clipboard — grant clipboard permission','تعذر قراءة الحافظة — امنح الإذن','Не удалось прочитать буфер — дайте разрешение','无法读取剪贴板——请授予权限'],
    ['Cần URL có param (?id=…)','A URL with parameters is required (?id=…)','مطلوب URL يحتوي معلمات (?id=…)','Требуется URL с параметрами (?id=…)','需要带参数的 URL (?id=…)'],
    ['Reset toàn bộ dữ liệu?','Reset all data?','إعادة تعيين كل البيانات؟','Сбросить все данные?','重置所有数据？'],
    ['★ Params mẫu','★ Sample parameters','★ معلمات نموذجية','★ Примеры параметров','★ 示例参数'],
    ['~150 params ưu tiên CSDL','~150 database-focused parameters','نحو 150 معلماً لقواعد البيانات','~150 параметров для БД','约 150 个数据库优先参数'],
    ['Gen = keywords × params × đuôi đã tick. Dùng','Generation = keywords × parameters × selected extensions. Use','الإنشاء = الكلمات × المعلمات × الامتدادات المحددة. استخدم','Генерация = ключи × параметры × выбранные расширения. Используйте','生成量 = 关键词 × 参数 × 所选扩展名。使用'],
    ['trong template để chèn đuôi. Nếu template không có {pt}/{ext} thì tool tự gắn','in the template to insert the extension. If the template has no {pt}/{ext}, the tool automatically adds','في القالب لإدراج الامتداد. إذا لم يتضمن القالب {pt}/{ext} فستضيف الأداة','в шаблоне для вставки расширения. Если в шаблоне нет {pt}/{ext}, инструмент добавит','在模板中插入扩展名。如果模板没有 {pt}/{ext}，工具会自动添加'],
    ['. Đuôi ưu tiên CSDL:','. Database-focused extensions:','. امتدادات قواعد البيانات:','. Расширения для БД:','。数据库优先扩展名：'],
    ['Dùng chung proxy + threads/timeout với Checker. Probe nhẹ, nhận diện DB qua error-signature (MySQL/MSSQL/PGSQL/Oracle/SQLite). Đồng bộ với preset DB ở Dork Maker.','Uses the Checker proxy, threads, and timeout settings. Lightweight probes identify databases by error signatures. Synchronized with the Dork Maker database preset.','يستخدم إعدادات الوكيل والمسارات والمهلة الخاصة بالفاحص. تحدد الفحوص الخفيفة قاعدة البيانات من بصمات الأخطاء. متزامن مع إعداد منشئ الاستعلامات.','Использует настройки прокси, потоков и тайм-аута Checker. Лёгкие пробы определяют БД по сигнатурам ошибок. Синхронизировано с пресетом Dork Maker.','使用检查器的代理、线程和超时设置。通过错误特征进行轻量数据库识别，并与 Dork Maker 数据库预设同步。'],
    ['httpbin.org/ip (nhẹ)','httpbin.org/ip (lightweight)','httpbin.org/ip (خفيف)','httpbin.org/ip (лёгкий)','httpbin.org/ip（轻量）'],
    ['→ chỉ giữ domain hoặc user.','→ keep only the domain or username.','← الاحتفاظ بالنطاق أو اسم المستخدم فقط.','→ оставить только домен или пользователя.','→ 仅保留域名或用户名。'],
    ['Hỗ trợ {kw} {xw} {pr} {param} {sf} {pt} {ext} {dom} {v1} {v2}','Supports {kw} {xw} {pr} {param} {sf} {pt} {ext} {dom} {v1} {v2}','يدعم {kw} {xw} {pr} {param} {sf} {pt} {ext} {dom} {v1} {v2}','Поддерживает {kw} {xw} {pr} {param} {sf} {pt} {ext} {dom} {v1} {v2}','支持 {kw} {xw} {pr} {param} {sf} {pt} {ext} {dom} {v1} {v2}'],
    ['Custom thêm: php7,cfml,axd... (cách nhau dấu phẩy)','Additional custom extensions: php7, cfml, axd... (comma-separated)','امتدادات إضافية: php7, cfml, axd... (مفصولة بفواصل)','Дополнительные расширения: php7, cfml, axd... (через запятую)','其他自定义扩展名：php7、cfml、axd……（逗号分隔）'],
    ['Chỉ tick đuôi hay dính SQLi (php/asp/aspx/jsp/do/cfm)','Select only extensions commonly affected by SQLi','حدد فقط الامتدادات الشائعة في SQLi','Выбрать расширения, часто подверженные SQLi','仅选择常见 SQLi 扩展名'],
    ['rỗng = mọi domain','empty = every domain','فارغ = كل النطاقات','пусто = все домены','留空 = 所有域名'],
    ['rỗng','empty','فارغ','пусто','留空'],
    ['Dork sẽ hiện ở đây (tối đa 200 dòng preview)…','Dorks will appear here (up to 200 preview lines)…','ستظهر الاستعلامات هنا (حتى 200 سطر معاينة)…','Дорки появятся здесь (до 200 строк предпросмотра)…','Dork 将显示在这里（最多预览 200 行）…'],
    ['Dán list URL, mỗi dòng 1 URL…','Paste URLs, one per line…','الصق عناوين URL، واحداً في كل سطر…','Вставьте URL, по одному в строке…','粘贴 URL 列表，每行一个…'],
    ['Dán URL có param, vd: http://site.com/page.php?id=1','Paste a URL with parameters, e.g. http://site.com/page.php?id=1','الصق عنوان URL يحتوي على معلمات، مثال: http://site.com/page.php?id=1','Вставьте URL с параметрами, например: http://site.com/page.php?id=1','粘贴带参数的 URL，例如：http://site.com/page.php?id=1'],
    ['Bỏ tick = parse hết mọi URL','Clear to parse every URL','ألغ التحديد لتحليل كل عناوين URL','Снимите флажок для разбора всех URL','取消选择以解析所有 URL'],
    ['để trống = scan hết','leave empty = scan all','اتركه فارغاً لفحص الكل','оставьте пустым для сканирования всех','留空 = 扫描全部'],
    ['Áp dụng khi dòng không ghi scheme','Used when a line has no scheme','يستخدم عندما لا يحتوي السطر على مخطط','Применяется, если в строке нет схемы','用于未填写协议的行'],
    ['Dán proxy, mỗi dòng 1 con. VD:','Paste proxies, one per line. Example:','الصق الوكلاء، واحداً في كل سطر. مثال:','Вставьте прокси, по одному в строке. Пример:','粘贴代理，每行一个。例如：'],
    ['Tìm ip / port…','Search IP / port…','ابحث عن IP / المنفذ…','Поиск IP / порта…','搜索 IP / 端口…'],
    ['Dán list cần xử lý…','Paste the list to process…','الصق القائمة المطلوب معالجتها…','Вставьте список для обработки…','粘贴待处理列表…'],
    ['Mango Keywords v3.5 sẵn sàng. Hãy import keywords + proxy để bắt đầu.','Mango Keywords v3.5 is ready. Import keywords and proxies to begin.','Mango Keywords v3.5 جاهز. استورد الكلمات والوكلاء للبدء.','Mango Keywords v3.5 готов. Импортируйте ключи и прокси.','Mango Keywords v3.5 已就绪。请导入关键词和代理。'],
    ['Proxy hỗ trợ:','Supported proxies:','الوكلاء المدعومون:','Поддерживаемые прокси:','支持的代理：'],
    ['Thiếu gói socks-proxy-agent — npm install để dùng SOCKS','Missing socks-proxy-agent — run npm install to use SOCKS','حزمة socks-proxy-agent مفقودة — شغّل npm install لاستخدام SOCKS','Нет socks-proxy-agent — выполните npm install для SOCKS','缺少 socks-proxy-agent——运行 npm install 以使用 SOCKS'],
    ['Tạo agent lỗi:','Agent creation error:','خطأ في إنشاء الوكيل:','Ошибка создания агента:','创建代理出错：'],
    // Runtime messages assembled by renderer.js. Keep these fragments below
    // the longer full-sentence rows so variable counts/paths are translated too.
    ['Hãy import keywords + parameters trước','Import keywords and parameters first','استورد الكلمات المفتاحية والمعلمات أولاً','Сначала импортируйте ключи и параметры','请先导入关键词和参数'],
    ['Không đọc được clipboard — cấp quyền clipboard','Cannot read the clipboard — grant clipboard permission','تعذرت قراءة الحافظة — امنح إذن الوصول إليها','Не удалось прочитать буфер обмена — предоставьте разрешение','无法读取剪贴板——请授予剪贴板权限'],
    ['Clipboard trống','The clipboard is empty','الحافظة فارغة','Буфер обмена пуст','剪贴板为空'],
    ['Params DB:','DB parameters:','معلمات قاعدة البيانات:','Параметры БД:','数据库参数：'],
    ['chuyên id/cat/product/...','focused on id/cat/product/...','مخصصة لـ id/cat/product/...','для id/cat/product/...','专用于 id/cat/product/...'],
    ['Đã nạp','Loaded','تم التحميل','Загружено','已加载'],
    ['Đã dán','Pasted','تم اللصق','Вставлено','已粘贴'],
    ['Đã gen','Generated','تم الإنشاء','Создано','已生成'],
    ['Gen xong:','Generation completed:','اكتمل الإنشاء:','Генерация завершена:','生成完成：'],
    ['Đã gửi','Sent','تم الإرسال','Отправлено','已发送'],
    ['sang Checker','to Checker','إلى الفاحص','в Checker','到检查器'],
    ['Đã dùng','Using','تم استخدام','Использовано','已使用'],
    ['Đã lưu','Saved','تم الحفظ','Сохранено','已保存'],
    ['Đã xuất','Exported','تم التصدير','Экспортировано','已导出'],
    ['Đã copy','Copied','تم النسخ','Скопировано','已复制'],
    ['Copy thất bại','Copy failed','فشل النسخ','Ошибка копирования','复制失败'],
    ['Hãy import dorks trước','Import dorks first','استورد الاستعلامات أولاً','Сначала импортируйте дорки','请先导入 Dork'],
    ['Check xong:','Check completed:','اكتمل الفحص:','Проверка завершена:','检查完成：'],
    ['Test xong:','Test completed:','اكتمل الاختبار:','Тест завершён:','测试完成：'],
    ['Xong:','Completed:','اكتمل:','Готово:','完成：'],
    ['Cần URL có param','A URL with parameters is required','يلزم عنوان URL يحتوي على معلمات','Нужен URL с параметрами','需要带参数的 URL'],
    ['không rõ DB','unknown database','قاعدة بيانات غير معروفة','неизвестная БД','未知数据库'],
    ['Chưa có proxy để test','No proxies available to test','لا توجد وكلاء للاختبار','Нет прокси для теста','没有可测试的代理'],
    ['lỗi','errors','أخطاء','ошибок','错误'],
    ['trùng','duplicates','تكرارات','дубликатов','重复'],
    ['Đã loại','Removed','تمت الإزالة','Удалено','已移除'],
    ['theo đuôi','by extension','حسب الامتداد','по расширению','按扩展名'],
    ['dòng','lines','أسطر','строк','行'],
    ['hay nằm ở','is commonly found at','يوجد غالباً في','часто встречается в','常见于'],
    ['Dùng kèm','Use with','استخدم مع','Используйте с','搭配使用'],
    ['Thêm từ khóa','Add keywords','أضف كلمات مفتاحية','Добавьте ключевые слова','添加关键词'],
    ['hay ở','is commonly found in','يوجد غالباً في','часто встречается в','常见于'],
    ['Thử params','Try parameters','جرّب المعلمات','Попробуйте параметры','尝试参数'],
    ['Kèm params','Use parameters','استخدم المعلمات','Используйте параметры','搭配参数'],
    ['nhỏ gọn','lightweight','خفيف','компактный','轻量'],
    ['Dork hẹp, dễ dính error SQLite.','A narrow dork that readily finds SQLite errors.','استعلام ضيق يسهل العثور به على أخطاء SQLite.','Узкий дорк, часто находящий ошибки SQLite.','范围较窄，容易发现 SQLite 错误。'],
    ['quét hết đuôi dễ dính SQLi, combos sẽ phình to','scanning every extension may find SQLi, but combinations will grow rapidly','قد يكشف فحص كل الامتدادات عن SQLi، لكن عدد التركيبات سيزداد بسرعة','сканирование всех расширений может найти SQLi, но число комбинаций быстро вырастет','扫描全部扩展名可能发现 SQLi，但组合数量会迅速增大'],
    // English runtime counters/statuses also need localization. These strings
    // are assigned after the initial DOM translation pass.
    ['Running…','Running…','قيد التشغيل…','Выполняется…','运行中…'],
    ['Finished','Finished','اكتمل','Завершено','已完成'],
    ['Checking…','Checking…','جارٍ الفحص…','Проверка…','检查中…'],
    ['Scanning…','Scanning…','جارٍ المسح…','Сканирование…','扫描中…'],
    ['Testing…','Testing…','جارٍ الاختبار…','Тестирование…','测试中…'],
    ['Stopped','Stopped','متوقف','Остановлено','已停止'],
    ['Sampling:','Sampling:','أخذ العينات:','Выборка:','采样：'],
    ['Generated:','Generated:','تم الإنشاء:','Создано:','已生成：'],
    ['Working:','Working:','العاملة:','Рабочие:','可用：'],
    ['Dead/Blocked:','Dead/Blocked:','متوقفة/محظورة:','Мёртвые/заблокированные:','失效/被阻止：'],
    ['Live:','Live:','العاملة:','Живые:','可用：'],
    ['Dead:','Dead:','المتوقفة:','Мёртвые:','失效：'],
    ['keywords','keywords','كلمات مفتاحية','ключевых слов','关键词'],
    ['parameters','parameters','معلمات','параметров','参数'],
    ['params','parameters','معلمات','параметров','参数'],
    ['dorks','dorks','استعلامات','дорков','Dork'],
    ['proxies','proxies','وكلاء','прокси','代理'],
    ['proxy','proxy','وكيل','прокси','代理'],
    ['working','working','عاملة','рабочих','可用'],
    ['dead','dead','متوقفة','мёртвых','失效'],
    ['unique','unique','فريدة','уникальных','唯一'],
    ['threads','threads','مسارات','потоков','线程'],
    ['timeout','timeout','مهلة','тайм-аут','超时'],
    ['rotation','rotation','تدوير','ротация','轮换'],
    ['và','and','و','и','和'],
    ['hoặc','or','أو','или','或'],
    ['đồng bộ sang Scanner','synchronized with Scanner','متزامن مع الفاحص','синхронизировано со Scanner','同步到扫描器'],
    ['Thiếu keywords/params','Missing keywords/parameters','الكلمات/المعلمات مفقودة','Нет ключей/параметров','缺少关键词/参数'],
    ['Nạp params mẫu:','Loaded sample parameters:','تم تحميل المعلمات النموذجية:','Загружены примеры параметров:','已加载示例参数：'],
    ['Params mẫu:','Sample parameters:','معلمات نموذجية:','Примеры параметров:','示例参数：'],
    ['Nạp params DB ưu tiên SQLi:','Loaded SQLi-focused DB parameters:','تم تحميل معلمات قاعدة البيانات الخاصة بـ SQLi:','Загружены параметры БД для SQLi:','已加载 SQLi 数据库优先参数：'],
    ['Nạp ext từ file:','Loaded extensions from file:','تم تحميل الامتدادات من الملف:','Расширения загружены из файла:','已从文件加载扩展名：'],
    ['Đã tick ext ưu tiên DB:','Selected database-focused extensions:','تم تحديد امتدادات قواعد البيانات:','Выбраны расширения для БД:','已选择数据库优先扩展名：'],
    ['Đã bỏ tick hết — sẽ dùng pt dự phòng','All extensions cleared — fallback page type will be used','تم إلغاء كل الامتدادات — سيستخدم نوع الصفحة الاحتياطي','Все расширения сняты — будет использован резервный тип','已清除所有扩展名——将使用备用页面类型'],
    ['Đã tick đuôi ưu tiên DB:','Selected database-focused extensions:','تم تحديد امتدادات قواعد البيانات:','Выбраны расширения для БД:','已选择数据库优先扩展名：'],
    ['DB ưu tiên →','Preferred database →','قاعدة البيانات المفضلة ←','Предпочтительная БД →','首选数据库 →'],
    ['Bắt đầu gen — tpl:','Generation started — template:','بدأ الإنشاء — القالب:','Генерация начата — шаблон:','开始生成——模板：'],
    ['dòng nữa (bấm Save để xuất full)','more lines (click Save to export all)','أسطر أخرى (اضغط حفظ لتصدير الكل)','строк ещё (нажмите Save для полного экспорта)','更多行（点击保存以完整导出）'],
    ['Chưa có dorks','No dorks available','لا توجد استعلامات','Дорков нет','没有 Dork'],
    ['Chưa gen dorks','No dorks generated yet','لم يتم إنشاء استعلامات بعد','Дорки ещё не созданы','尚未生成 Dork'],
    ['dorks cần check','dorks to check','استعلامات للفحص','дорков для проверки','个待检查 Dork'],
    ['dorks đã gen','generated dorks','استعلامات منشأة','созданных дорков','个已生成 Dork'],
    ['Đã yêu cầu dừng checker…','Stop requested…','تم طلب الإيقاف…','Запрошена остановка…','已请求停止…'],
    ['Không còn URL nào sau lọc đuôi','No URLs remain after extension filtering','لا توجد عناوين URL بعد تصفية الامتدادات','После фильтрации расширений URL не осталось','扩展名筛选后没有剩余 URL'],
    ['Scanner lọc đuôi','Scanner extension filter','مرشح امتدادات الفاحص','Фильтр расширений Scanner','扫描器扩展名筛选'],
    ['Scan xong:','Scan completed:','اكتمل الفحص:','Сканирование завершено:','扫描完成：'],
    ['nghi vấn vuln','possible vulnerabilities','ثغرات محتملة','возможных уязвимостей','个疑似漏洞'],
    ['Hãy dán proxy trước','Paste proxies first','الصق الوكلاء أولاً','Сначала вставьте прокси','请先粘贴代理'],
    ['Đã xóa toàn bộ proxy','All proxies removed','تم حذف كل الوكلاء','Все прокси удалены','已删除所有代理'],
    ['Không có trùng','No duplicates found','لا توجد تكرارات','Дубликатов нет','没有重复项'],
    ['Đổi default type →','Default type changed →','تم تغيير النوع الافتراضي ←','Тип по умолчанию изменён →','默认类型已更改 →'],
    ['Đã xuất session','Session exported','تم تصدير الجلسة','Сессия экспортирована','会话已导出'],
    ['Đã reset session','Session reset','تمت إعادة تعيين الجلسة','Сессия сброшена','会话已重置'],
    ['Cảnh báo: thiếu socks-proxy-agent — chạy `npm install` để bật SOCKS5/SOCKS4','Warning: socks-proxy-agent is missing — run npm install to enable SOCKS5/SOCKS4','تحذير: حزمة socks-proxy-agent مفقودة — شغّل npm install لتفعيل SOCKS5/SOCKS4','Предупреждение: нет socks-proxy-agent — выполните npm install для SOCKS5/SOCKS4','警告：缺少 socks-proxy-agent——运行 npm install 启用 SOCKS5/SOCKS4'],
    ['Gợi ý: cài http-proxy-agent để tối ưu proxy HTTP','Tip: install http-proxy-agent to optimize HTTP proxies','تلميح: ثبّت http-proxy-agent لتحسين وكلاء HTTP','Совет: установите http-proxy-agent для оптимизации HTTP-прокси','提示：安装 http-proxy-agent 以优化 HTTP 代理'],
    ['sai format','invalid format','تنسيق غير صالح','неверный формат','格式错误'],
    ['mới','new','جديد','новых','新增'],
    ['giữ','kept','تم الاحتفاظ','оставлено','保留'],
    ['loại','removed','تمت الإزالة','удалено','移除'],
    ['từ','from','من','из','从'],
    ['nữa','more','أخرى','ещё','更多'],
    ['Search Scraper','Search Scraper','مستخرج البحث','Поисковый скрапер','搜索提取器'],
    ['Thu thập URL mục tiêu từ search engines','Harvest target URLs from search engines','جمع عناوين URL المستهدفة من محركات البحث','Сбор целевых URL из поисковых систем','从搜索引擎抓取目标 URL'],
    ['Input & Search Engines','Input & Search Engines','المدخلات ومحركات البحث','Ввод и поисковые системы','输入与搜索引擎'],
    ['Nhập dork hoặc bấm nút nạp bên dưới… (mỗi dòng 1 dork)','Enter dorks or click load buttons below… (one dork per line)','أدخل الاستعلامات أو اضغط على أزرار التحميل أدناه... (استعلام واحد في كل سطر)','Введите дорки или используйте кнопки загрузки ниже… (один дорк на строку)','输入 Dork 或点击下方加载按钮…（每行一个 Dork）'],
    ['Từ Maker','From Maker','من المنشئ','Из Maker','来自生成器'],
    ['Từ Working Checker','From Working Checker','من الفاحص (العاملة)','Из Working Checker','来自可用检查器'],
    ['Chỉ lấy 1 URL cho mỗi domain (Domain Unique)','Keep only 1 URL per domain (Domain Unique)','الاحتفاظ برابط واحد فقط لكل نطاق (نطاق فريد)','Только 1 URL на домен (уникальный домен)','每个域名仅保留 1 个 URL（域名去重）'],
    ['Số trang mỗi dork (Depth)','Pages per dork (Depth)','الصفحات لكل استعلام (العمق)','Страниц на дорк (глубина)','每个 Dork 页数（深度）'],
    ['1 trang (~10 URLs)','1 page (~10 URLs)','صفحة واحدة (~10 روابط)','1 страница (~10 URL)','1 页（~10 个 URL）'],
    ['2 trang (~20 URLs)','2 pages (~20 URLs)','صفحتان (~20 رابطاً)','2 страницы (~20 URL)','2 页（~20 个 URL）'],
    ['3 trang (~30 URLs)','3 pages (~30 URLs)','3 صفحات (~30 رابطاً)','3 страницы (~30 URL)','3 页（~30 个 URL）'],
    ['5 trang (~50 URLs)','5 pages (~50 URLs)','5 صفحات (~50 رابطاً)','5 страниц (~50 URL)','5 页（~50 个 URL）'],
    ['Start Scrape','Start Scrape','بدء الاستخراج','Начать скрапинг','开始抓取'],
    ['Gửi sang Parser','Send to Parser','إرسال إلى المحلل','Отправить в Parser','发送至解析器'],
    ['Gửi sang Scanner','Send to Scanner','إرسال إلى الفاحص','Отправить в Scanner','发送至扫描器'],
    ['Chưa có URL nào — hãy nạp dorks và bấm Start Scrape.','No URLs yet — load dorks and click Start Scrape.','لا توجد روابط بعد — حمّل الاستعلامات واضغط بدء الاستخراج.','URL пока нет — загрузите дорки и нажмите «Начать скрапинг».','暂无 URL——请加载 Dork 并点击开始抓取。'],
    ['Live Harvested URLs','Live Harvested URLs','الروابط المستخرجة مباشرة','Собранные URL в реальном времени','实时抓取的 URL'],
    ['Save URLs (.txt)','Save URLs (.txt)','حفظ الروابط (.txt)','Сохранить URL (.txt)','保存 URL (.txt)'],
    ['Scraper','Scraper','المستخرج','Скрапер','提取器'],
    ['Domains:','Domains:','النطاقات:','Домены:','域名：'],
    ['URLs:','URLs:','عناوين URL:','URL:','URL：'],
    ['url/s','url/s','رابط/ث','url/с','url/秒']
  ];
  // Translation rows are ordered as: Vietnamese source, English, Arabic,
  // Russian, Chinese. Keep this mapping explicit to avoid language-column drift.
  const columns = { vi: 0, en: 1, ar: 2, ru: 3, zh: 4 };
  const idx = l => columns[l] ?? -1;
  let lang = localStorage.getItem('mango.language') || 'en';
  if (!LANGS[lang]) lang = 'en';
  const originals = new WeakMap(), rendered = new WeakMap(), attrs = new WeakMap();
  let applying = false;
  function translate(s, target=lang) {
    if (!s || !s.trim()) return s;
    const ti = idx(target); if (ti < 0 || target === 'vi') return s;
    let out = s;
    const ordered = rows.slice().sort((a,b) => Math.max(b[0].length,b[1].length)-Math.max(a[0].length,a[1].length));
    const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replaceSafe = (value, source, replacement) => {
      // English dictionary entries such as "or" must not alter words like
      // "Dork", "port", "working", etc. Use word boundaries for simple
      // ASCII tokens; use exact phrase replacement for sentences/non-ASCII.
      if (/^[A-Za-z]+$/.test(source)) {
        const re = new RegExp(`\\b${escaped(source)}\\b`, 'g');
        return { matched: re.test(value), value: value.replace(re, replacement) };
      }
      return { matched: value.includes(source), value: value.split(source).join(replacement) };
    };
    for (const r of ordered) {
      let hit = replaceSafe(out, r[0], r[ti]);
      if (!hit.matched) hit = replaceSafe(out, r[1], r[ti]);
      if (hit.matched && r[ti]) out = hit.value;
    }
    return out;
  }
  function applyNode(n) {
    if (n.nodeType === Node.TEXT_NODE) {
      if (!originals.has(n)) originals.set(n, n.nodeValue);
      const v = translate(originals.get(n));
      rendered.set(n, v);
      if (n.nodeValue !== v) n.nodeValue = v;
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      let a = attrs.get(n); if (!a) { a = {}; attrs.set(n,a); }
      for (const k of ['placeholder','title','aria-label']) if (n.hasAttribute(k)) {
        if (!(k in a)) a[k] = n.getAttribute(k);
        n.setAttribute(k, translate(a[k]));
      }
      n.childNodes.forEach(applyNode);
    }
  }
  function applyLanguage(next) {
    lang = LANGS[next] ? next : 'en'; localStorage.setItem('mango.language', lang);
    applying = true; document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', lang === 'ar'); applyNode(document.body);
    const sel = document.getElementById('language-select'); if (sel) sel.value = lang;
    applying = false; window.dispatchEvent(new CustomEvent('mango:language', {detail:{lang}}));
  }
  function mount() {
    const host = document.querySelector('.sidebar') || document.body;
    const box = document.createElement('div'); box.className='language-box';
    box.innerHTML = `<label for="language-select">🌐 <span>Language</span></label><select id="language-select" class="input">${Object.entries(LANGS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>`;
    // insertBefore only accepts a direct child. `.login-info` is nested inside
    // `.side-footer`, so using it as the anchor prevented the language UI from
    // mounting at all. Place the selector immediately before the footer.
    const footer = host.querySelector('.side-footer');
    host.insertBefore(box, footer || null);
    box.querySelector('select').addEventListener('change', e => applyLanguage(e.target.value));
    const nativeConfirm = window.confirm.bind(window);
    window.confirm = message => nativeConfirm(translate(String(message)));
    applyLanguage(lang);
    new MutationObserver(ms => {
      if (applying) return; applying = true;
      for (const m of ms) {
        if (m.type === 'characterData') {
          // Ignore mutations produced by our own translation pass. Renderer-originated
          // status/toast changes become the new canonical source for later switches.
          if (rendered.get(m.target) === m.target.nodeValue) continue;
          originals.set(m.target, m.target.nodeValue); applyNode(m.target);
        }
        else m.addedNodes.forEach(n => applyNode(n));
      }
      applying = false;
    }).observe(document.body,{subtree:true,childList:true,characterData:true});
  }
  window.MangoI18n = { setLanguage: applyLanguage, getLanguage:()=>lang, t:translate, languages:LANGS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
