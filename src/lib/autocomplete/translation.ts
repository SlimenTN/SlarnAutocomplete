/**
 * Enum class contains the available languages
 */
export enum ACTranslator{
  EN = 'en',
  FR = 'fr',
  AR = 'ar',
}

/**
 * Configuration of the translator
 */
export const translator: any = {
  // available languages
  availableLanguages: [ACTranslator.EN, ACTranslator.FR, ACTranslator.AR],

  // translation book
  dictionary: {
    loadingText: {
      'en': 'Loading data...',
      'fr': 'Chargement des données...',
      'ar': 'تحميل البيانات...'
    },
    noMatchFoundText: {
      'en': 'No match found!',
      'fr': 'Pas de résultat trouvé!',
      'ar': 'لا يوجد تطابق!'
    },
    errors:{
      passingArrayValueWithNoMultipleOption: {
        'en': 'You have passed an array value to be selected\n either change the value or set the "multiple" option to true in the configuration.',
        'fr': 'Vous avez passé une valeur de tableau à sélectionner\n modifier la valeur ou changer l\'option "multiple" à true dans la configuration.',
        'ar': 'لقد قمت بتمرير قيمة جدول لاختيارها, عليك بتغير القمة أو تغير الخيار "multiple" إلى "true".'
      },
      unknownType: {
        'en': 'The type of "selectedId" must be number, string or Array of numbers or strings!',
        'fr': 'Le type de "selectedId" doit être number, string ou tableau de numbers ou strings',
        'ar': 'نوع المتغير "selectedId" يجب أن يكون numbers، strings أو مصفوفة numbers أو strings',
      },
      unknownLanguage: {
        'en': 'Unknown language ":1"!\n Please make sure to select one of the available languages ":2".',
        'fr': 'Langue inconnue ":1"\n Assurez-vous de sélectionner l\'une des langues disponibles ":2".',
        'ar': 'اللغة المختارة ":1" غير معروفة، الرجاء إختيار واحدة من الغات المتوفرة ":2".'
      },
      unknownFieldForGroupOption:{
        'en': 'You have added the option "group" to the autocomplete but forgot to specify the "field"!',
        'fr': 'Vous avez ajouté l\'option "group" mais vous avez oublié l\'option "field"!',
        'ar': 'لقد قمت بإضافة الخيار "group" لكن لم تحدد الخيار "field"!',
      },
      unknownKeyValue: {
        'en': 'Can\'t find the key ":1" in the object ":2"!',
        'fr': 'On ne peux pas trouvé le clé ":1" dans l\'object ":2"!',
        'ar': 'لم نتمكن من إيجاد المتغير ":1" في المكون ":2"!',
      },
      duplicateItemDetected: {
        'en': 'An item with the same "key" value already exist in the "data" array: ":1"\nUnable to append the item ":2"',
        'fr': 'An élément avec la même valeur de "key" existe dans le tableau "data": ":1"\nImpossible d\'ajouter l\'élément ":2"',
        'ar': 'يوجد عنصر بنفس قمة المتغير "key" في المصفوفة "data": ":1"\n لا يمكن إضافة العنصر: ":2"',
      },
      appendItemWorkOnlyLocally: {
        'en': '"appendItem()" function is for local configuration only\nIf you are using an API (remote configuration) and you add a new object to it then this new object will be available when you start typing in the autocomplete.\'',
        'fr': '"appendItem()" est une fonction pour la configuration locale\nSi vous utilisez une API (configuration à distance) et vous ajoutez un nouveau objet donc ce dérnier sera disponible lorsque vous commencez à taper dans l\'autocomplete.',
        'ar': '"appendItem()" هي وظيفة تستعمل فقط في التكوين المحلي "ACLocalConfoguration"\n إذا كنت تستعمل التكوين عن بعد "ACRemoteConfiguration" إذاً العنصر الجديد سيكون متاح حالما تشرع في الكتابة.',
      }
    }
  }
};

/**
 * Add values to message dynamically and translate it
 * @param message
 * @param values
 * @returns
 */
export function dynamic_translation(message: string, values: Array<any>){
  let counter = 1;
  values.forEach(value => {
    message = message.replace(':'+counter, value);
    counter++;
  });

  return message;
}
