/**
 * Russian UI strings. This is the default (and only) locale in MVP, but all
 * user-facing text lives here so adding locales later is a drop-in: create
 * another dictionary of the same shape and switch it in ./index.ts.
 *
 * Rule: no hard-coded user-facing strings in components — reference `t.*`.
 */
export const ru = {
  common: {
    appName: "tutorOS",
    loading: "Загрузка…",
    save: "Сохранить",
    cancel: "Отмена",
    create: "Создать",
    delete: "Удалить",
    edit: "Редактировать",
    back: "Назад",
    confirm: "Подтвердить",
    optional: "необязательно",
    errorTitle: "Что-то пошло не так",
    errorRetry: "Повторить",
    emptyDefault: "Пока пусто",
    lesson: "Урок",
    toggleTheme: "Переключить тему",
    close: "Закрыть",
    moreActions: "Еще действия",
    pagination: {
      perPage: "На странице:",
      prev: "Назад",
      next: "Вперёд",
      page: (page: number, total: number) => `Стр. ${page} из ${total}`,
      range: (from: number, to: number, total: number) => `${from}–${to} из ${total}`,
    },
    dateTime: {
      pickDate: "Выберите дату",
      today: "Сегодня",
      tomorrow: "Завтра",
      nextWeek: "+1 неделя",
      time: "Время",
      hours: "Часы",
      minutes: "Минуты",
    },
  },
  errors: {
    notFoundEyebrow: "404",
    notFoundTitle: "Страница не найдена",
    notFoundDescription:
      "Если вкладка была открыта давно, tutorOS восстановит рабочую сессию после входа и вернёт вас по сохранённому адресу. Если сам адрес больше не существует, откройте ближайший рабочий раздел.",
    errorEyebrow: "Ошибка",
    errorTitle: "Не удалось загрузить страницу",
    errorDescription:
      "Попробуйте повторить загрузку. Если сеанс был неактивен слишком долго, откройте страницу входа — после авторизации tutorOS вернёт вас к нужному разделу.",
    actions: {
      home: "На главную",
      login: "Войти",
      dashboard: "В обзор",
      students: "К ученикам",
      admin: "В админку",
      users: "К пользователям",
      feedback: "К обращениям",
    },
  },
  auth: {
    signInTitle: "Вход",
    signUpTitle: "Регистрация",
    signInSubtitle: "С возвращением — войдите в рабочее место.",
    signUpSubtitle: "Создайте аккаунт и заведите первого ученика.",
    signInBadge: "Рабочее место репетитора",
    signUpBadge: "Бесплатно · без карты",
    email: "Email",
    password: "Пароль",
    confirmPassword: "Повторите пароль",
    name: "Имя",
    namePlaceholder: "Как вас зовут",
    signIn: "Войти",
    signUp: "Зарегистрироваться",
    signOut: "Выйти",
    toSignUp: "Нет аккаунта? Зарегистрироваться",
    toSignIn: "Уже есть аккаунт? Войти",
    invalidCredentials: "Неверный email или пароль",
    // Сообщения валидации
    emailInvalid: "Введите корректный email",
    nameRequired: "Укажите имя",
    passwordRequired: "Введите пароль",
    // Подсказки и состояния
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    capsLockOn: "Включён Caps Lock",
    emailTaken: "Этот email уже зарегистрирован",
    weakPassword: "Пароль слишком простой или встречался в утечках. Выберите другой.",
    checkEmail: "Проверьте почту для подтверждения регистрации.",
    // Требования к паролю (live-чеклист)
    passwordRequirementsTitle: "Пароль должен содержать:",
    passwordRules: {
      length: "Минимум 8 символов",
      lower: "Строчную букву (a–z)",
      upper: "Заглавную букву (A–Z)",
      digit: "Цифру (0–9)",
      special: "Спецсимвол (!@#$…)",
    },
    passwordsDontMatch: "Пароли не совпадают",
    // Сброс пароля по ссылке из письма
    reset: {
      title: "Новый пароль",
      subtitle: "Придумайте новый пароль для входа.",
      newPassword: "Новый пароль",
      confirmPassword: "Повторите пароль",
      submit: "Сохранить пароль",
      success: "Пароль обновлён — войдите с новым паролем.",
      linkInvalid: "Ссылка недействительна или устарела. Попросите администратора прислать новую.",
    },
    // Индикатор силы
    strengthLabel: "Надёжность пароля",
    strengthWeak: "Слабый",
    strengthMedium: "Средний",
    strengthStrong: "Надёжный",
    // Бренд-панель
    brandTagline: "Учёт занятий, оплат и домашек — в одном месте.",
    brandPoints: {
      students: "Карточки учеников и баланс занятий",
      schedule: "Расписание и завершение урока в один клик",
      homework: "Домашка и ссылка для ученика без регистрации",
    },
  },
  nav: {
    dashboard: "Обзор",
    students: "Ученики",
    schedule: "Расписание",
    messages: "\u0427\u0430\u0442\u044b",
    settings: "Настройки",
  },
  dashboard: {
    title: "Обзор",
    welcome: "Рабочее место репетитора",
    nextLesson: "Следующий урок",
    noNextLesson: "Запланированных уроков нет",
    today: "Сегодня",
    todayEmpty: "На сегодня уроков нет",
    inbox: "Требует действия",
    inboxEmpty: "Всё разобрано",
    toReview: "ДЗ на проверку",
    overdueLessons: "Незавершённые уроки",
    overdueHomework: "Просроченная домашка",
    lowBalance: "Пора пополнить",
    lowBalanceEmpty: "Баланс у всех в порядке",
    monthIncome: "Доход за месяц",
    showMore: (count: number) => `Ещё ${count}`,
  },
  settings: {
    title: "Настройки",
    currency: "Валюта",
    saved: "Сохранено",
    security: "Безопасность",
    changePassword: "Сменить пароль",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    confirmNewPassword: "Повторите новый пароль",
    currentPasswordWrong: "Неверный текущий пароль",
    newPasswordSameAsOld: "Новый пароль совпадает со старым",
    passwordChanged: "Пароль изменён",
    onboarding: {
      title: "Обучение",
      description: "Коротко пройти основной сценарий: ученик, баланс, расписание, урок и домашка.",
      noticeTitle: "Нужно пройти обучение",
      noticeDescription:
        "Быстрый старт ещё не завершён. Пройдите его, чтобы не потеряться в основном флоу tutorOS.",
      restart: "Пройти обучение заново",
    },
  },
  onboarding: {
    eyebrow: "Быстрый старт",
    title: "Как работать в tutorOS",
    description:
      "Пройдите основной флоу за несколько шагов. Можно открыть нужный раздел прямо из подсказки.",
    progressLabel: "Прогресс обучения",
    progress: (current: number, total: number) => `Шаг ${current} из ${total}`,
    completed: (completed: number, total: number) => `Выполнено ${completed} из ${total}`,
    skip: "Пропустить",
    next: "Дальше",
    finish: "Завершить",
    targetMissing: "Откройте нужный раздел, и подсказка встанет рядом с действием автоматически.",
    pressHighlighted: "Нажмите подсвеченную кнопку — шаг засчитается сам.",
    welcome: {
      title: "Добро пожаловать в tutorOS",
      description:
        "Покажу основное за пару минут: ученики, баланс, расписание, проведение урока и домашка. 8 коротких шагов — можно прервать в любой момент и продолжить из настроек.",
      start: "Начать",
      later: "Позже",
    },
    steps: {
      overview: {
        title: "Начинайте с обзора",
        description:
          "Подсвечен пункт «Обзор» — стартовая страница дня: ближайший урок, домашки на проверку и ученики с низким балансом. Нажмите его, чтобы открыть.",
        action: "Открыть обзор",
      },
      students: {
        title: "Добавьте первого ученика",
        description:
          "Нажмите подсвеченную кнопку «Добавить ученика» и заведите карточку. Обязательно только имя — контакты и предмет можно добавить позже.",
        action: "Открыть учеников",
      },
      balance: {
        title: "Заведите пакет занятий",
        description:
          "Откройте карточку ученика (нажмите на него в списке) и нажмите «Добавить пакет» — это баланс занятий. Оплата рядом — отдельный денежный учёт; баланс меняют только пакеты и завершённые уроки.",
        action: "Перейти к карточкам",
      },
      schedule: {
        title: "Запланируйте урок",
        description:
          "Нажмите «Добавить урок» и укажите ученика, дату, время и длительность. Тему и заметку можно оставить пустыми.",
        action: "Открыть расписание",
      },
      complete: {
        title: "Завершите проведённый урок",
        description:
          "Откройте подсвеченный урок и нажмите «Завершить». tutorOS спишет одно занятие с баланса и перенесёт урок в историю.",
        action: "Открыть расписание",
      },
      share: {
        title: "Отправьте ученику ссылку",
        description:
          "Откройте карточку ученика (нажмите на него в списке) и нажмите «Скопировать ссылку». По ней ученик без регистрации видит расписание, баланс и домашку — отправьте её в мессенджере.",
        action: "Открыть учеников",
      },
      homework: {
        title: "Выдайте и проверьте домашку",
        description:
          "Откройте карточку ученика (нажмите на него в списке) и нажмите «Добавить ДЗ». Ученик сдаёт ответ по своей ссылке, а вы проверяете его с комментарием.",
        action: "Перейти к ученикам",
      },
      settings: {
        title: "Повтор есть в настройках",
        description:
          "Это обучение всегда можно повторить: «Настройки» → «Пройти обучение заново». После полного прохождения напоминание больше не появится.",
        action: "Открыть настройки",
      },
    },
  },
  students: {
    title: "Ученики",
    addStudent: "Добавить ученика",
    newStudent: "Новый ученик",
    editStudent: "Редактировать ученика",
    empty: "Ещё нет учеников. Добавьте первого, чтобы начать.",
    fields: {
      name: "Имя",
      contact: "Контакт ученика",
      parentContact: "Контакт родителя",
      subject: "Предмет",
      level: "Уровень",
      shareCode: "Код ссылки",
    },
    tabs: {
      overview: "Обзор",
      packages: "Пакеты и оплаты",
      lessons: "Уроки",
      homework: "Домашка",
      chat: "\u0427\u0430\u0442",
    },
    views: {
      cards: "Карточки",
      list: "Список",
    },
    search: "Поиск по имени",
    noResults: "Никого не нашлось",
    balance: "Баланс занятий",
    lessonsLeft: "осталось занятий",
    lowBalance: "Пора пополнить баланс",
    shareLink: "Ссылка для ученика",
    copyLink: "Скопировать ссылку",
    deleteConfirm: "Удалить ученика и все его данные? Это действие необратимо.",
    actionsMenu: "Ещё",
    topUp: "Пополнить",
    attention: {
      title: "Требует внимания",
      allClear: "Сейчас ничего не требует внимания",
      reviewPending: "ДЗ ждут проверки",
      reviewAction: "Проверить",
      overdue: "Просроченная домашка",
      overdueAction: "Открыть",
      noUpcoming: "Нет запланированных уроков",
    },
    overview: {
      nextLesson: "Следующий урок",
      noNextLesson: "Урок не запланирован",
      toReview: "На проверку",
      totalPaid: "Оплачено всего",
      recentActivity: "Недавняя активность",
      open: "Открыть",
      addContact: "Добавить контакт",
      paymentActivity: "Оплата",
    },
    share: {
      codeHintCreate: "латиница, цифры и дефис; пусто — случайная ссылка",
      codeHintEdit: "латиница, цифры и дефис; пусто — оставить текущую",
      editWarning: "Изменение кода сделает старую ссылку недействительной",
      taken: "Такой код уже занят, попробуйте другой",
    },
  },
  packages: {
    title: "Пакеты",
    add: "Добавить пакет",
    empty: "Пакетов пока нет — заведите первый, чтобы начать баланс.",
    of: "из",
    lessonsUnit: "зан.",
    purchasedTotal: "Куплено всего",
    remainingTotal: "Осталось",
    fields: { totalLessons: "Занятий в пакете", price: "Цена" },
    deleteConfirm: "Удалить пакет? Баланс уменьшится на остаток занятий.",
  },
  payments: {
    title: "Оплаты",
    add: "Добавить оплату",
    empty: "Оплат пока нет.",
    paidTotal: "Оплачено всего",
    fields: { amount: "Сумма", paidAt: "Дата оплаты", note: "Заметка" },
    deleteConfirm: "Удалить запись об оплате?",
  },
  lessons: {
    title: "Уроки",
    add: "Добавить урок",
    newLesson: "Новый урок",
    newLessonSubtitle: "Создайте новое занятие в расписании",
    empty: "Уроков пока нет — запланируйте первый.",
    emptyWeek: "На этой неделе уроков нет.",
    emptyDay: "На этот день уроков нет.",
    durationUnit: "мин",
    fields: {
      student: "Ученик",
      startsAt: "Дата и время",
      startDate: "Дата начала",
      duration: "Длительность",
      daysOfWeek: "Дни недели",
      timePerDay: "Время для выбранных дней",
      start: "Начало",
      end: "Конец",
      topic: "Тема",
      note: "Заметка",
      color: "Цвет урока",
    },
    statuses: {
      scheduled: "Запланирован",
      done: "Проведён",
      canceled: "Отменён",
      no_show: "Не пришёл",
    },
    cancel: "Отменить",
    cancelConfirm: "Отменить этот урок?",
    noShow: "Не пришёл",
    noShowConfirm: "Отметить, что ученик не пришёл? Занятие всё равно спишется с баланса.",
    complete: "Завершить",
    completeConfirm: "Завершить урок? С баланса спишется одно занятие.",
    reopen: "Вернуть в запланированные",
    reopenConfirm:
      "Вернуть урок в расписание? Списанное занятие вернётся на баланс; выданная домашка останется.",
    lowBalanceAlert: "Занятий осталось мало — пора пополнить баланс.",
    upcoming: "Предстоящие",
    history: "История",
    historyEmpty: "Проведённых уроков пока нет.",
    views: { list: "Список", week: "Неделя", month: "Месяц" },
    today: "Сегодня",
    overdue: "Пора завершить",
    prevWeek: "Пред. неделя",
    nextWeek: "След. неделя",
    thisWeek: "Эта неделя",
    prevMonth: "Пред. месяц",
    nextMonth: "След. месяц",
    thisMonth: "Этот месяц",
    backToMonth: "Назад к месяцу",
    backToWeek: "Назад к неделе",
    moreLessons: (count: number) => `Ещё ${count}`,
    selectStudent: "Выберите ученика",
    weekdaysShort: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    timeFrom: "с",
    timeTo: "до",
    pickDayError: "Выберите хотя бы один день недели",
    timeRangeError: "Время окончания должно быть позже начала",
    colors: {
      violet: "Фиолетовый",
      blue: "Синий",
      green: "Зелёный",
      amber: "Жёлтый",
      orange: "Оранжевый",
      pink: "Розовый",
      purple: "Сиреневый",
      teal: "Бирюзовый",
    },
    // Модалка-карточка урока
    detailsTitle: "Урок",
    edit: "Редактировать",
    editTitle: "Редактирование урока",
    reschedule: "Перенести",
    rescheduleTitle: "Перенос урока",
    deleteLesson: "Удалить урок",
    deleteConfirm: "Удалить урок? Действие необратимо.",
    linkedHomework: "Домашка по уроку",
    noLinkedHomework: "К уроку домашка не привязана.",
    loadError: "Не удалось загрузить урок.",
    notFound: "Урок не найден.",
    // Завершение урока
    completeTitle: "Завершить урок",
    completeHint: "С баланса спишется одно занятие.",
    completeWithHomework: "Завершить и выдать ДЗ",
    assignHomework: "Выдать домашку",
    lessonsLeftShort: "Осталось занятий:",
    noActivePackage: "Нет активного пакета — занятие не списалось. Пора пополнить баланс.",
    // Повторяющиеся уроки
    recurrence: {
      toggle: "Повторять",
      label: "Повтор",
      none: "Не повторять",
      everyWeek: "Каждую неделю",
      everyTwoWeeks: "Каждые 2 недели",
      hintWeekly: "Урок будет повторяться каждую неделю",
      hintBiweekly: "Урок будет повторяться раз в две недели",
      endsAfter: "После",
      endsAfterFull: "После N занятий",
      endTitle: "Окончание серии",
      endsOn: "До даты",
      occurrences: "занятий",
      seriesBadge: "Серия",
      scopeTitle: "Применить к",
      scopeOne: "Только этот урок",
      scopeFuture: "Этот и следующие",
      scopeAll: "Вся серия",
    },
  },
  homework: {
    title: "Домашка",
    add: "Добавить ДЗ",
    empty: "Домашки пока нет.",
    needsAttention: "Требуют внимания",
    others: "Остальные",
    noLesson: "Без привязки к уроку",
    noUpcomingLessons: "Ближайших запланированных уроков пока нет.",
    dueLessonHint: "Срок сдачи будет поставлен на время выбранного урока.",
    chooseFile: "Загрузить файл",
    noFileSelected: "Файл не выбран",
    fileLimit: "До 35 МБ.",
    openAssignmentFile: "Файл задания",
    openSubmissionFile: "Файл ответа",
    submit: "Сдать",
    review: "Проверить",
    submission: "Ответ ученика",
    feedback: "Комментарий",
    alreadyReviewed: "Домашка уже проверена.",
    submittedMessage: "Домашка отправлена.",
    due: "Срок",
    overdue: "просрочено",
    fields: {
      title: "Название",
      lesson: "Урок",
      dueLesson: "Сдать к уроку",
      description: "Описание",
      attachment: "Файл задания",
      dueAt: "Срок сдачи",
      submissionText: "Ответ",
      submissionFile: "Файл ответа",
      feedback: "Комментарий",
    },
    statuses: {
      assigned: "Выдано",
      submitted: "Сдано",
      reviewed: "Проверено",
    },
  },
  support: {
    button: "Поддержка",
    closeEmpty: "Закрыть пустую форму поддержки",
    title: "Поддержка",
    description:
      "Сообщите о баге, ошибке или идее. Мы увидим страницу, с которой пришло обращение.",
    submit: "Отправить",
    successTitle: "Спасибо, обращение отправлено",
    successDescription: "Мы разберём его и используем для улучшения tutorOS.",
    successClose: "Готово",
    feedbackUnavailable:
      "Приём обращений ещё не подключён к базе. Примените миграцию feedback в Supabase.",
    sessionExpired: "Сессия завершена. Войдите снова, чтобы отправить обращение.",
    fields: {
      category: "Тип обращения",
      message: "Что случилось",
      contact: "Контакт для ответа",
    },
    placeholders: {
      message:
        "Опишите проблему или предложение. Если это ошибка, напишите, что вы делали перед ней.",
      contact: "Email или Telegram",
    },
    categories: [
      { value: "bug", label: "Баг" },
      { value: "idea", label: "Идея" },
      { value: "question", label: "Вопрос" },
      { value: "other", label: "Другое" },
    ],
  },
  admin: {
    title: "Администрирование",
    subtitle: "Общие показатели сервиса",
    forbidden: "Доступ запрещён",
    nav: {
      overview: "Обзор",
      users: "Пользователи",
      feedback: "Обратная связь",
    },
    sections: { summary: "Сводка", lessons: "Уроки по статусам", activity: "Активность" },
    stats: {
      users: "Пользователи",
      tutors: "Репетиторы",
      students: "Ученики",
      lessons: "Уроки",
      feedbackNew: "Новые обращения",
      reviewCta: "Разобрать",
      openCta: "Открыть",
      perWeek: "за неделю",
      doneThisWeek: "Проведено за неделю",
      noStudents: "Репетиторы без учеников",
      inactive30d: "Без активности 30 дней",
    },
    lessonStatus: {
      scheduled: "Запланировано",
      done: "Проведено",
      canceled: "Отменено",
      no_show: "Не пришёл",
    },
    feedback: {
      title: "Обратная связь",
      empty: "Обращений пока нет.",
      statuses: { new: "Новое", seen: "Просмотрено", closed: "Закрыто" },
      filters: { all: "Все", new: "Новые", seen: "Просмотренные", closed: "Закрытые" },
      contact: "Контакт",
      page: "Страница",
      registered: "Зарегистрирован",
      anonymous: "Аноним",
    },
    directory: {
      usersTitle: "Пользователи",
      usersSubtitle: "Репетиторы сервиса: профиль, ученики и управление аккаунтом.",
      tutorsTitle: "Репетиторы",
      tutorsSubtitle: "Новые аккаунты и основные данные репетиторов.",
      studentsTitle: "Ученики",
      studentsSubtitle: "Новые ученики с привязкой к репетиторам.",
      tabs: { tutors: "Репетиторы", students: "Ученики" },
      tutorsEmpty: "Репетиторов пока нет.",
      studentsEmpty: "Учеников пока нет.",
      emptyValue: "Не указано",
      searchPlaceholder: "Поиск по имени или email",
      searchEmpty: "Никого не нашлось",
      fields: {
        email: "Email",
        currency: "Валюта",
        createdAt: "Добавлен",
        tutor: "Репетитор",
        contact: "Контакт ученика",
        parentContact: "Контакт родителя",
        subject: "Предмет",
        level: "Уровень",
        studentsCount: "Учеников",
        lessonsCount: "Уроков",
        homeworkCount: "Домашек",
      },
    },
    tutorDetail: {
      back: "К списку репетиторов",
      profileTitle: "Профиль репетитора",
      analyticsTitle: "Аналитика преподавателя",
      metrics: {
        students: "Ученики",
        lessonsTotal: "Уроки всего",
        done: "Проведено",
        income: "Доход",
      },
      actions: "Управление аккаунтом",
      editProfile: "Редактировать профиль",
      editProfileTitle: "Профиль репетитора",
      changeEmail: "Сменить email",
      changeEmailTitle: "Смена email",
      changeEmailHint: "Это и логин для входа. Email подтверждается автоматически.",
      resetPassword: "Сбросить пароль",
      resetPasswordHint: "Репетитору придёт письмо со ссылкой для установки нового пароля.",
      resetPasswordSent: "Письмо для сброса пароля отправлено.",
      deleteTutor: "Удалить репетитора",
      deleteConfirm:
        "Удалить репетитора и ВСЕ его данные (ученики, уроки, оплаты, домашки)? Действие необратимо.",
      deleted: "Репетитор удалён.",
      profileSaved: "Профиль сохранён.",
      emailChanged: "Email обновлён.",
      notFound: "Репетитор не найден.",
      fields: { name: "Имя", currency: "Валюта", email: "Email" },
    },
  },
  landing: {
    nav: {
      features: "Возможности",
      how: "Как это работает",
    },
    hero: {
      badge: "Для репетиторов 1-на-1",
      title: "Учёт занятий, оплат и домашек — в одном месте",
      subtitle:
        "tutorOS заменяет тетрадку, табличку оплат и переписки в Telegram. Ведите баланс занятий, расписание и домашку без хаоса — и проводите уроки спокойно.",
      ctaPrimary: "Начать бесплатно",
      ctaSecondary: "Войти",
      note: "Без карты · Русский интерфейс · Любая валюта",
    },
    mockup: {
      studentName: "Анна Петрова",
      studentInitials: "АП",
      caption: "Карточка ученика",
      lessonsLeft: "осталось занятий",
      nextLesson: "Ближайший урок",
      nextLessonValue: "Завтра, 17:00 · Математика",
      homework: "Домашка",
      homeworkValue: "Задачи 4–7 · сдано",
    },
    features: {
      title: "Всё, что нужно соло-репетитору",
      subtitle: "Тонкий набор инструментов вместо пяти разрозненных вкладок.",
      items: {
        student: {
          title: "Карточка ученика",
          desc: "Профиль, баланс, история уроков и заметки — всё на одном экране.",
        },
        balance: {
          title: "Баланс и оплаты",
          desc: "Пакеты занятий и ручной учёт оплат. Баланс списывается сам.",
        },
        schedule: {
          title: "Расписание",
          desc: "Уроки по неделям или списком, понятные статусы и быстрая отмена.",
        },
        complete: {
          title: "Завершение урока",
          desc: "Одна кнопка: спишет занятие, сохранит тему и уведёт урок в историю.",
        },
        homework: {
          title: "Домашка",
          desc: "Выдали задание → ученик сдал по ссылке → проверили с комментарием.",
        },
        share: {
          title: "Ссылка для ученика",
          desc: "Ученик видит расписание, баланс и ДЗ без регистрации.",
        },
      },
    },
    steps: {
      title: "Как это работает",
      subtitle: "От первого ученика до проведённого урока — за пару минут.",
      items: {
        add: {
          title: "Добавьте ученика",
          desc: "Заведите карточку и пакет занятий — сразу появится баланс.",
        },
        plan: {
          title: "Запланируйте уроки",
          desc: "Создавайте уроки в расписании и следите за статусами.",
        },
        finish: {
          title: "Завершайте в один клик",
          desc: "Занятие списывается с баланса и уходит в историю автоматически.",
        },
        link: {
          title: "Делитесь ссылкой",
          desc: "Ученик сам смотрит расписание и сдаёт домашку — без регистрации.",
        },
      },
    },
    cta: {
      title: "Готовы навести порядок в репетиторстве?",
      subtitle: "Начните бесплатно — первый ученик и расписание займут пару минут.",
      button: "Создать аккаунт",
    },
    footer: {
      tagline: "Рабочее место соло-репетитора.",
      rights: "Все права защищены.",
    },
  },
  chat: {
    title: "\u0427\u0430\u0442\u044b",
    subtitle:
      "\u041f\u0435\u0440\u0435\u043f\u0438\u0441\u043a\u0430 \u0441 \u0443\u0447\u0435\u043d\u0438\u043a\u0430\u043c\u0438 \u043f\u0440\u044f\u043c\u043e \u0432\u043d\u0443\u0442\u0440\u0438 tutorOS.",
    conversationCount: (count: number) =>
      `${count} \u0434\u0438\u0430\u043b\u043e\u0433\u043e\u0432`,
    pickStudent:
      "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0447\u0435\u043d\u0438\u043a\u0430",
    changeStudent: "\u0423\u0447\u0435\u043d\u0438\u043a",
    studentList: "\u0423\u0447\u0435\u043d\u0438\u043a\u0438",
    openStudentList:
      "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u0443\u0447\u0435\u043d\u0438\u043a\u043e\u0432",
    searchStudents: "\u041f\u043e\u0438\u0441\u043a \u0443\u0447\u0435\u043d\u0438\u043a\u0430",
    unreadCount: (count: number) =>
      `${count} \u043d\u0435\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u0445`,
    newMessage:
      "\u041d\u043e\u0432\u043e\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435",
    noUnreadMessages: "\u041d\u043e\u0432\u044b\u0445 \u043d\u0435\u0442",
    pickStudentDescription:
      "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0434\u0438\u0430\u043b\u043e\u0433 \u0441\u043b\u0435\u0432\u0430, \u0447\u0442\u043e\u0431\u044b \u0443\u0432\u0438\u0434\u0435\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u0438 \u043d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435.",
    noStudentsTitle:
      "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0443\u0447\u0435\u043d\u0438\u043a\u043e\u0432",
    noStudentsDescription:
      "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0443\u0447\u0435\u043d\u0438\u043a\u0430, \u0438 \u0437\u0434\u0435\u0441\u044c \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0435\u0433\u043e \u043b\u0438\u0447\u043d\u044b\u0439 \u0447\u0430\u0442.",
    noMessagesYet:
      "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442",
    emptyTitle:
      "\u041d\u0430\u0447\u043d\u0438\u0442\u0435 \u043f\u0435\u0440\u0435\u043f\u0438\u0441\u043a\u0443",
    emptyDescription:
      "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f \u0432\u0438\u0434\u043d\u044b \u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u044e \u0437\u0434\u0435\u0441\u044c, \u0430 \u0443\u0447\u0435\u043d\u0438\u043a\u0443 \u2014 \u043d\u0430 \u0435\u0433\u043e \u043b\u0438\u0447\u043d\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435 \u043f\u043e \u0441\u0441\u044b\u043b\u043a\u0435.",
    placeholder:
      "\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435",
    send: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
    sendHint:
      "Enter \u2014 \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c, Shift + Enter \u2014 \u043d\u043e\u0432\u0430\u044f \u0441\u0442\u0440\u043e\u043a\u0430",
    senderTutor: "\u041f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u044c",
    senderStudent: "\u0423\u0447\u0435\u043d\u0438\u043a",
    sentStatus: "\u0414\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u043e",
    read: "\u041f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043e",
    setupRequired:
      "\u0427\u0430\u0442 \u0435\u0449\u0435 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d \u043a \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0431\u0430\u0437\u0435 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f. \u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u0435 \u043c\u0438\u0433\u0440\u0430\u0446\u0438\u0438 0015_chat.sql, 0016_chat_files.sql \u0438 0017_chat_read_state.sql \u0432 \u043f\u0440\u043e\u0435\u043a\u0442 rcjfjqmzgaavbtumccwz.",
    emptyMessageError:
      "\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u0438\u043b\u0438 \u043f\u0440\u0438\u043a\u0440\u0435\u043f\u0438\u0442\u0435 \u0444\u0430\u0439\u043b",
    attachFile:
      "\u041f\u0440\u0438\u043a\u0440\u0435\u043f\u0438\u0442\u044c \u0444\u0430\u0439\u043b",
    removeFile: "\u0423\u0431\u0440\u0430\u0442\u044c \u0444\u0430\u0439\u043b",
    attachment: "\u0424\u0430\u0439\u043b",
    openAttachment: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0444\u0430\u0439\u043b",
    fileLimit: "\u0424\u0430\u0439\u043b \u0434\u043e 10 \u041c\u0411",
    fileTooLarge:
      "\u0424\u0430\u0439\u043b \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043d\u0435 \u0431\u043e\u043b\u044c\u0448\u0435 10 \u041c\u0411",
    fileReadError:
      "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u044c \u0444\u0430\u0439\u043b",
    fileUploadError:
      "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u0430\u0439\u043b",
    validationError:
      "\u041e\u0448\u0438\u0431\u043a\u0430 \u0432\u0430\u043b\u0438\u0434\u0430\u0446\u0438\u0438",
    studentNotFound:
      "\u0423\u0447\u0435\u043d\u0438\u043a \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d",
    linkInvalid:
      "\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u0430",
  },
  share: {
    nextLesson: "Ближайший урок",
    noLessons: "Уроки пока не запланированы",
    toSubmit: "Нужно сдать",
    reviewed: "Проверено",
    noHomework: "Домашка пока не задана",
    allDone: "Всё сдано — можно отдохнуть",
    changeAnswer: "Изменить ответ",
    lowBalanceZero: "Занятия закончились — пора пополнить баланс",
    balanceLabel: "Баланс",
    tutorLabel: "Репетитор",
    tabsLabel:
      "\u0420\u0430\u0437\u0434\u0435\u043b\u044b \u043b\u0438\u0447\u043d\u043e\u0433\u043e \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0430",
    overviewTitle: "\u041e\u0431\u0437\u043e\u0440",
    overviewSubtitle:
      "\u0411\u043b\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0437\u0430\u043d\u044f\u0442\u0438\u0435, \u0434\u043e\u043c\u0430\u0448\u043a\u0430 \u0438 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f \u0432 \u043e\u0434\u043d\u043e\u043c \u043c\u0435\u0441\u0442\u0435.",
    openTab: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c",
    footerNote:
      "Это личная страница ученика. Сохраните ссылку — по ней всегда видно расписание, баланс и домашку.",
  },
  // Письма ученику (Resend). Отправитель — «tutorOS», тон нейтральный.
  email: {
    common: {
      greeting: (name: string) => `Здравствуйте, ${name}!`,
      signature: "tutorOS",
      openCabinet: "Открыть личный кабинет",
    },
    homework: {
      subject: (title: string) => `Новое домашнее задание: ${title}`,
      intro: "Вам выдали новое домашнее задание:",
    },
    lesson: {
      subjectOne: "Запланирован урок",
      subjectMany: "Запланированы новые уроки",
      introOne: (when: string) => `Для вас запланирован урок: ${when}.`,
      introMany: (when: string) => `Для вас запланированы новые уроки. Ближайший — ${when}.`,
    },
  },
  // Telegram: интерфейс подключения + тексты сообщений бота.
  telegram: {
    // Секция в настройках репетитора
    settings: {
      title: "Telegram-уведомления",
      description:
        "Подключите свой Telegram, чтобы получать важные уведомления: у ученика мало занятий, ученик сдал ДЗ, ученик подключился.",
      connect: "Подключить Telegram",
      connected: "Telegram подключён",
      disconnect: "Отключить",
      openBot: "Открыть бота и подтвердить",
      instruction:
        "Нажмите кнопку — откроется бот. Нажмите в нём «Старт», и Telegram подключится. Обновите страницу, чтобы увидеть статус.",
      ttlHint: "Ссылка действует ограниченное время — если не успели, сгенерируйте новую.",
      notConfigured:
        "Бот ещё не настроен на сервере (нет TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_USERNAME).",
    },
    // Блок на карточке ученика
    student: {
      title: "Telegram ученика",
      description:
        "Отправьте ученику эту ссылку — по ней он подключит напоминания об уроках и домашке.",
      connected: "Telegram подключён",
      notConnected: "Telegram не подключён",
      copyLink: "Скопировать Telegram-ссылку",
      disconnect: "Отключить",
    },
    // Ответы бота на действия в чате
    bot: {
      connectedTutor: "✅ Telegram подключён. Сюда будут приходить важные уведомления tutorOS.",
      connectedStudent: (name: string) =>
        `✅ Готово, ${name}! Сюда будут приходить напоминания об уроках и домашке.`,
      linkInvalid: "Ссылка недействительна или устарела. Попросите репетитора прислать новую.",
      stopped: "Уведомления отключены. Чтобы подключиться снова, откройте свою ссылку заново.",
      unknown: "Откройте персональную ссылку из tutorOS, чтобы подключить уведомления.",
    },
    // Тела уведомлений. Отправляются обычным текстом (без разметки).
    messages: {
      open: (url: string) => `Открыть кабинет: ${url}`,
      // Ученику
      lessonReminder24h: (when: string) => `Напоминание об уроке: ${when}.`,
      lessonReminder2h: (when: string) => `Скоро урок — ${when}. До встречи!`,
      homeworkAssigned: (title: string) => `Вам выдали новое домашнее задание: ${title}.`,
      homeworkDueSoon: (title: string, when: string) =>
        `Не забудьте сдать домашку «${title}» — срок ${when}.`,
      homeworkReviewed: (title: string) =>
        `Домашка «${title}» проверена — посмотрите комментарий в кабинете.`,
      lessonCanceled: (when: string) => `Урок ${when} отменён.`,
      lessonRescheduled: (when: string) => `Урок перенесён: теперь ${when}.`,
      lessonsCanceled: (count: number) => `Отменены уроки: ${count}.`,
      lessonsRescheduled: (count: number) => `Перенесены уроки: ${count}.`,
      // Репетитору
      lowBalance: (studentName: string, left: number) =>
        `У ученика ${studentName} осталось занятий: ${left}. Пора предложить оплату.`,
      homeworkSubmitted: (studentName: string, title: string) =>
        `${studentName} сдал(а) домашку «${title}» — нужна проверка.`,
      studentConnected: (studentName: string) =>
        `${studentName} подключил(а) Telegram-уведомления.`,
    },
  },
} as const;

export type Dictionary = typeof ru;
